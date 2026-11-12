import type { SQLiteBindValue } from 'expo-sqlite';

import { obtenerDb } from './database';
import { AHORA } from './schema';
import type {
  CambioEstado,
  ClaveEstado,
  ClaveGravedad,
  ClaveTipoFuga,
  Estado,
  FugaPublica,
  Gravedad,
  ReporteDetalle,
  TipoFuga,
  Usuario,
} from './types';

// Catálogos -------------------------------------------------------------------

export async function obtenerTiposFuga(): Promise<TipoFuga[]> {
  const db = await obtenerDb();
  return db.getAllAsync<TipoFuga>('SELECT * FROM tipos_fuga ORDER BY rowid');
}

export async function obtenerGravedades(): Promise<Gravedad[]> {
  const db = await obtenerDb();
  return db.getAllAsync<Gravedad>('SELECT * FROM gravedades ORDER BY nivel');
}

export async function obtenerEstados(): Promise<Estado[]> {
  const db = await obtenerDb();
  return db.getAllAsync<Estado>('SELECT * FROM estados ORDER BY rowid');
}

// Usuario ---------------------------------------------------------------------

/** En el teléfono solo hay un ciudadano: el dueño del dispositivo. */
const ID_USUARIO_LOCAL = 1;

export async function obtenerUsuarioLocal(): Promise<Usuario> {
  const db = await obtenerDb();
  await db.runAsync('INSERT OR IGNORE INTO usuarios (id) VALUES (?)', ID_USUARIO_LOCAL);
  const usuario = await db.getFirstAsync<Usuario>(
    'SELECT * FROM usuarios WHERE id = ?',
    ID_USUARIO_LOCAL,
  );
  return usuario!;
}

export async function actualizarCorreo(correo: string | null): Promise<void> {
  const usuario = await obtenerUsuarioLocal();
  const db = await obtenerDb();
  await db.runAsync(
    'UPDATE usuarios SET correo = ? WHERE id = ?',
    correo?.trim() || null,
    usuario.id,
  );
}

// Reportes --------------------------------------------------------------------

const SELECT_DETALLE = `
  SELECT r.*,
         t.nombre AS tipo_fuga_nombre,
         g.nombre AS gravedad_nombre,
         e.nombre AS estado_nombre
  FROM reportes r
  JOIN tipos_fuga t ON t.clave = r.tipo_fuga
  JOIN gravedades g ON g.clave = r.gravedad
  JOIN estados e    ON e.clave = r.estado`;

export interface NuevoReporte {
  fotoUri: string;
  latitud: number;
  longitud: number;
  ubicacionConfirmada: boolean;
  tipoFuga: ClaveTipoFuga;
  gravedad: ClaveGravedad;
  descripcion?: string;
}

/** RF01–RF07. Guarda el reporte como "recibido" y devuelve su identificador. */
export async function crearReporte(datos: NuevoReporte): Promise<number> {
  // RNF09
  if (!datos.fotoUri.trim()) {
    throw new Error('Toma una foto de la fuga antes de enviar el reporte.');
  }
  if (!datos.ubicacionConfirmada) {
    throw new Error('Confirma la ubicación en el mapa antes de enviar el reporte.');
  }

  const usuario = await obtenerUsuarioLocal();
  const db = await obtenerDb();
  let id = 0;

  await db.withTransactionAsync(async () => {
    const resultado = await db.runAsync(
      `INSERT INTO reportes
         (usuario_id, foto_uri, descripcion, tipo_fuga, gravedad, latitud, longitud, ubicacion_confirmada)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      usuario.id,
      datos.fotoUri,
      datos.descripcion?.trim() || null,
      datos.tipoFuga,
      datos.gravedad,
      datos.latitud,
      datos.longitud,
    );
    id = resultado.lastInsertRowId;

    await db.runAsync(
      `INSERT INTO historial_estados (reporte_id, estado_anterior, estado_nuevo)
       VALUES (?, NULL, 'recibido')`,
      id,
    );
  });

  return id;
}

/** RF12. */
export async function obtenerReporte(id: number): Promise<ReporteDetalle | null> {
  const db = await obtenerDb();
  return db.getFirstAsync<ReporteDetalle>(`${SELECT_DETALLE} WHERE r.id = ?`, id);
}

export interface FiltroReportes {
  usuarioId?: number;
  estado?: ClaveEstado;
  desde?: Date;
  hasta?: Date;
}

/** RF08, RF09 y RF11. Sin filtro devuelve todos, del más reciente al más antiguo. */
export async function buscarReportes(filtro: FiltroReportes = {}): Promise<ReporteDetalle[]> {
  const condiciones: string[] = [];
  const parametros: SQLiteBindValue[] = [];

  if (filtro.usuarioId !== undefined) {
    condiciones.push('r.usuario_id = ?');
    parametros.push(filtro.usuarioId);
  }
  if (filtro.estado) {
    condiciones.push('r.estado = ?');
    parametros.push(filtro.estado);
  }
  if (filtro.desde) {
    condiciones.push('r.fecha_reporte >= ?');
    parametros.push(filtro.desde.toISOString());
  }
  if (filtro.hasta) {
    condiciones.push('r.fecha_reporte <= ?');
    parametros.push(filtro.hasta.toISOString());
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  const db = await obtenerDb();
  return db.getAllAsync<ReporteDetalle>(
    `${SELECT_DETALLE} ${where} ORDER BY r.fecha_reporte DESC`,
    parametros,
  );
}

const RADIO_TIERRA_KM = 6371;
const KM_POR_GRADO = 111.32;

function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.sqrt(a));
}

/** RF10. Fugas activas dentro de `radioKm` alrededor de un punto. */
export async function obtenerFugasCercanas(
  latitud: number,
  longitud: number,
  radioKm = 2,
): Promise<FugaPublica[]> {
  // Primero un rectángulo que usa el índice, luego se recorta al círculo exacto.
  const dLat = radioKm / KM_POR_GRADO;
  const dLon = radioKm / (KM_POR_GRADO * Math.cos((latitud * Math.PI) / 180));

  const db = await obtenerDb();
  const filas = await db.getAllAsync<FugaPublica>(
    `SELECT r.id, r.tipo_fuga, r.gravedad, r.estado, r.latitud, r.longitud, r.fecha_reporte
     FROM reportes r
     JOIN estados e ON e.clave = r.estado
     WHERE e.activo = 1
       AND r.latitud  BETWEEN ? AND ?
       AND r.longitud BETWEEN ? AND ?`,
    latitud - dLat,
    latitud + dLat,
    longitud - dLon,
    longitud + dLon,
  );

  return filas.filter((f) => distanciaKm(latitud, longitud, f.latitud, f.longitud) <= radioKm);
}

export interface OpcionesCambioEstado {
  /** Quién hizo el cambio. Sin valor, se registra como cambio del sistema. */
  personalId?: number;
  observaciones?: string;
  /** Obligatorio al descartar (RF18). */
  motivoDescarte?: string;
  /** Obligatorio al marcar como duplicado (RF15). */
  reporteOriginalId?: number;
}

/** RF13–RF18. Cambia el estado de un reporte y lo anota en el historial. */
export async function cambiarEstado(
  reporteId: number,
  nuevoEstado: ClaveEstado,
  opciones: OpcionesCambioEstado = {},
): Promise<void> {
  if (nuevoEstado === 'descartado' && !opciones.motivoDescarte?.trim()) {
    throw new Error('Escribe el motivo por el que se descarta el reporte.');
  }
  if (nuevoEstado === 'duplicado' && opciones.reporteOriginalId === undefined) {
    throw new Error('Indica cuál es el reporte original de este duplicado.');
  }

  const db = await obtenerDb();
  await db.withTransactionAsync(async () => {
    const actual = await db.getFirstAsync<{ estado: ClaveEstado }>(
      'SELECT estado FROM reportes WHERE id = ?',
      reporteId,
    );
    if (!actual) {
      throw new Error(`No existe el reporte ${reporteId}.`);
    }
    if (actual.estado === nuevoEstado) {
      return;
    }

    await db.runAsync(
      `UPDATE reportes SET
         estado                  = $estado,
         observaciones           = coalesce($observaciones, observaciones),
         motivo_descarte         = coalesce($motivo, motivo_descarte),
         reporte_original_id     = coalesce($original, reporte_original_id),
         fecha_validacion        = coalesce(fecha_validacion,
                                     CASE WHEN $estado = 'validado' THEN ${AHORA} END),
         fecha_inicio_reparacion = coalesce(fecha_inicio_reparacion,
                                     CASE WHEN $estado = 'en_reparacion' THEN ${AHORA} END),
         fecha_resolucion        = coalesce(fecha_resolucion,
                                     CASE WHEN $estado = 'resuelto' THEN ${AHORA} END),
         sincronizado            = 0
       WHERE id = $id`,
      {
        $id: reporteId,
        $estado: nuevoEstado,
        $observaciones: opciones.observaciones?.trim() || null,
        $motivo: opciones.motivoDescarte?.trim() || null,
        $original: opciones.reporteOriginalId ?? null,
      },
    );

    await db.runAsync(
      `INSERT INTO historial_estados (reporte_id, estado_anterior, estado_nuevo, personal_id)
       VALUES (?, ?, ?, ?)`,
      reporteId,
      actual.estado,
      nuevoEstado,
      opciones.personalId ?? null,
    );
  });
}

/** Historial de cambios de un reporte, del más antiguo al más reciente. */
export async function obtenerHistorial(reporteId: number): Promise<CambioEstado[]> {
  const db = await obtenerDb();
  return db.getAllAsync<CambioEstado>(
    `SELECT h.*, p.nombre AS personal_nombre
     FROM historial_estados h
     LEFT JOIN personal p ON p.id = h.personal_id
     WHERE h.reporte_id = ?
     ORDER BY h.fecha_cambio, h.id`,
    reporteId,
  );
}
