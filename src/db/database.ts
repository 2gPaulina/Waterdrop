import type { SQLiteDatabase } from "expo-sqlite";
import type { CambioEstado, Reporte } from "@/types/reporte";

export const NOMBRE_BD = "waterdrop_local.db";

const MIGRACIONES: string[] = [
  `
  CREATE TABLE IF NOT EXISTS reportes (
    id TEXT PRIMARY KEY NOT NULL,
    ciudadano_id TEXT,
    descripcion TEXT NOT NULL,
    tipo TEXT NOT NULL,
    gravedad TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'recibido',
    referencia TEXT NOT NULL DEFAULT '',
    latitud REAL,
    longitud REAL,
    ubicacion_confirmada INTEGER NOT NULL DEFAULT 0,
    correo_ciudadano TEXT,
    foto_uri TEXT,
    fotografia_url TEXT,
    motivo_descarte TEXT,
    reporte_original_id TEXT,
    fecha_validacion TEXT,
    fecha_inicio_reparacion TEXT,
    fecha_resolucion TEXT,
    observaciones_personal TEXT,
    fecha_hora TEXT NOT NULL,
    actualizado_en TEXT NOT NULL,
    sync_estado TEXT NOT NULL DEFAULT 'pendiente_envio',
    sync_error TEXT
  );

  CREATE TABLE IF NOT EXISTS historial_estados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporte_id TEXT NOT NULL REFERENCES reportes(id) ON DELETE CASCADE,
    estado_anterior TEXT,
    nuevo_estado TEXT NOT NULL,
    fecha_hora TEXT NOT NULL,
    personal_id TEXT
  );
  `,
  // v2: ejemplo para el futuro
  // `ALTER TABLE reportes ADD COLUMN nueva_columna TEXT;`,
];

export async function initDb(db: SQLiteDatabase) {
  // SQLite trae las llaves foráneas apagadas; hay que activarlas en cada conexión
  await db.execAsync("PRAGMA foreign_keys = ON;");

  const fila = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const versionActual = fila?.user_version ?? 0;

  if (versionActual === 0) {
    await db.execAsync("PRAGMA journal_mode = WAL;");
  }

  for (let version = versionActual; version < MIGRACIONES.length; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRACIONES[version]);
      await db.execAsync(`PRAGMA user_version = ${version + 1};`);
    });
  }
}

// Columnas de datos del reporte (sin las de sincronización)
const COLS = [
  "id", "ciudadano_id", "descripcion", "tipo", "gravedad", "estado", "referencia",
  "latitud", "longitud", "ubicacion_confirmada", "correo_ciudadano",
  "foto_uri", "fotografia_url", "motivo_descarte", "reporte_original_id",
  "fecha_validacion", "fecha_inicio_reparacion", "fecha_resolucion",
  "observaciones_personal", "fecha_hora", "actualizado_en",
];

const valores = (r: Reporte) => [
  r.id, r.userId ?? null, r.descripcion, r.tipo, r.gravedad, r.estado, r.referencia ?? "",
  r.latitud ?? null, r.longitud ?? null, r.ubicacionConfirmada ?? 0, r.correoCiudadano ?? null,
  r.fotoUri ?? null, r.fotoPath ?? null, r.motivoDescarte ?? null, r.reporteOriginalId ?? null,
  r.fechaValidacion ?? null, r.fechaInicioReparacion ?? null, r.fechaResolucion ?? null,
  r.observacionesPersonal ?? null, r.creadoEn, r.actualizadoEn ?? r.creadoEn,
];

// Columnas con el nombre de Supabase; aquí se devuelven con los nombres que usa la app
const SELECT_REPORTE = `
  id, ciudadano_id AS userId, descripcion, tipo, gravedad, estado, referencia,
  latitud, longitud, ubicacion_confirmada AS ubicacionConfirmada,
  correo_ciudadano AS correoCiudadano, foto_uri AS fotoUri, fotografia_url AS fotoPath,
  motivo_descarte AS motivoDescarte, reporte_original_id AS reporteOriginalId,
  fecha_validacion AS fechaValidacion, fecha_inicio_reparacion AS fechaInicioReparacion,
  fecha_resolucion AS fechaResolucion, observaciones_personal AS observacionesPersonal,
  fecha_hora AS creadoEn, actualizado_en AS actualizadoEn,
  sync_estado AS syncEstado, sync_error AS syncError`;

export const listarReportes = (db: SQLiteDatabase) =>
  db.getAllAsync<Reporte>(`SELECT ${SELECT_REPORTE} FROM reportes ORDER BY fecha_hora DESC`);

export const obtenerReporte = (db: SQLiteDatabase, id: string) =>
  db.getFirstAsync<Reporte>(`SELECT ${SELECT_REPORTE} FROM reportes WHERE id = ?`, id);

// "Reportes realizados por el ciudadano"
export const reportesDeCiudadano = (db: SQLiteDatabase, ciudadanoId: string) =>
  db.getAllAsync<Reporte>(
    `SELECT ${SELECT_REPORTE} FROM reportes WHERE ciudadano_id = ? ORDER BY fecha_hora DESC`,
    ciudadanoId
  );

export const pendientes = (db: SQLiteDatabase) =>
  db.getAllAsync<Reporte>(
    `SELECT ${SELECT_REPORTE} FROM reportes WHERE sync_estado IN ('pendiente_envio','error')`
  );

export const historialDe = (db: SQLiteDatabase, reporteId: string) =>
  db.getAllAsync<CambioEstado>(
    `SELECT id, reporte_id AS reporteId, estado_anterior AS estadoAnterior,
            nuevo_estado AS nuevoEstado, fecha_hora AS cambiadoEn, personal_id AS personalId
     FROM historial_estados WHERE reporte_id = ? ORDER BY id ASC`,
    reporteId
  );

async function registrarCambio(
  db: SQLiteDatabase,
  reporteId: string,
  anterior: string | null,
  nuevo: string,
  cuando: string,
  personalId: string | null = null
) {
  await db.runAsync(
    `INSERT INTO historial_estados (reporte_id, estado_anterior, nuevo_estado, fecha_hora, personal_id)
     VALUES (?,?,?,?,?)`,
    reporteId, anterior, nuevo, cuando, personalId
  );
}

export async function crearReporte(db: SQLiteDatabase, r: Reporte) {
  await db.runAsync(
    `INSERT INTO reportes (${COLS.join(",")}, sync_estado, sync_error)
     VALUES (${COLS.map(() => "?").join(",")}, 'pendiente_envio', NULL)`,
    ...valores(r)
  );
  await registrarCambio(db, r.id, null, r.estado, r.creadoEn);
}

// El ciudadano edita sus datos; el estado y las fechas de gestión los maneja el personal
export async function actualizarReporte(db: SQLiteDatabase, r: Reporte) {
  await db.runAsync(
    `UPDATE reportes SET descripcion=?, tipo=?, gravedad=?, referencia=?, latitud=?, longitud=?,
       ubicacion_confirmada=?, correo_ciudadano=?, foto_uri=?, fotografia_url=?, actualizado_en=?,
       sync_estado='pendiente_envio', sync_error=NULL
     WHERE id=?`,
    r.descripcion, r.tipo, r.gravedad, r.referencia ?? "", r.latitud ?? null, r.longitud ?? null,
    r.ubicacionConfirmada ?? 0, r.correoCiudadano ?? null, r.fotoUri ?? null, r.fotoPath ?? null,
    r.actualizadoEn, r.id
  );
}

export const eliminarReporte = (db: SQLiteDatabase, id: string) =>
  db.runAsync("DELETE FROM reportes WHERE id = ?", id);

export const marcarEnviado = (
  db: SQLiteDatabase,
  id: string,
  fotoPath: string | null,
  ciudadanoId?: string | null
) =>
  db.runAsync(
    `UPDATE reportes SET sync_estado='enviado', sync_error=NULL, fotografia_url=?,
       ciudadano_id=COALESCE(?, ciudadano_id) WHERE id=?`,
    fotoPath, ciudadanoId ?? null, id
  );

export const marcarError = (db: SQLiteDatabase, id: string, msg: string) =>
  db.runAsync("UPDATE reportes SET sync_estado='error', sync_error=? WHERE id=?", msg, id);

/** Guarda lo que viene de Supabase. Si ya existe, refresca lo que maneja el personal. */
export async function guardarRemoto(db: SQLiteDatabase, r: Reporte) {
  const previo = await db.getFirstAsync<{ estado: string; sync_estado: string }>(
    "SELECT estado, sync_estado FROM reportes WHERE id = ?", r.id
  );

  await db.runAsync(
    `INSERT INTO reportes (${COLS.join(",")}, sync_estado, sync_error)
     VALUES (${COLS.map(() => "?").join(",")}, 'enviado', NULL)
     ON CONFLICT(id) DO UPDATE SET
       estado=excluded.estado,
       motivo_descarte=excluded.motivo_descarte,
       reporte_original_id=excluded.reporte_original_id,
       fecha_validacion=excluded.fecha_validacion,
       fecha_inicio_reparacion=excluded.fecha_inicio_reparacion,
       fecha_resolucion=excluded.fecha_resolucion,
       observaciones_personal=excluded.observaciones_personal,
       fotografia_url=COALESCE(excluded.fotografia_url, reportes.fotografia_url),
       actualizado_en=excluded.actualizado_en
     WHERE reportes.sync_estado='enviado'`,
    ...valores(r)
  );

  // Si el personal cambió el estado en la nube, queda anotado en el historial
  if (!previo) {
    await registrarCambio(db, r.id, null, r.estado, r.creadoEn);
  } else if (previo.sync_estado === "enviado" && previo.estado !== r.estado) {
    await registrarCambio(db, r.id, previo.estado, r.estado, r.actualizadoEn);
  }
}