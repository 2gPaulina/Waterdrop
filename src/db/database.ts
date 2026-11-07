import type { SQLiteDatabase } from "expo-sqlite";
import type { CambioEstado, Reporte } from "@/types/reporte";

export async function initDb(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS reportes (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
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
      foto_path TEXT,
      motivo_descarte TEXT,
      reporte_original_id TEXT,
      fecha_validacion TEXT,
      fecha_inicio_reparacion TEXT,
      fecha_resolucion TEXT,
      observaciones_personal TEXT,
      creado_en TEXT NOT NULL,
      actualizado_en TEXT NOT NULL,
      sync_estado TEXT NOT NULL DEFAULT 'pendiente_envio',
      sync_error TEXT
    );

    CREATE TABLE IF NOT EXISTS historial_estados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporte_id TEXT NOT NULL,
      estado_anterior TEXT,
      nuevo_estado TEXT NOT NULL,
      cambiado_en TEXT NOT NULL,
      personal_id TEXT
    );
  `);
}

// Columnas de datos del reporte (sin las de sincronización)
const COLS = [
  "id", "user_id", "descripcion", "tipo", "gravedad", "estado", "referencia",
  "latitud", "longitud", "ubicacion_confirmada", "correo_ciudadano",
  "foto_uri", "foto_path", "motivo_descarte", "reporte_original_id",
  "fecha_validacion", "fecha_inicio_reparacion", "fecha_resolucion",
  "observaciones_personal", "creado_en", "actualizado_en",
];

const valores = (r: Reporte) => [
  r.id, r.id ?? null, r.descripcion, r.tipo, r.gravedad, r.estado, r.referencia,
  r.latitud, r.longitud, r.ubicacionConfirmada, r.correoCiudadano,
  r.fotoUri, r.fotoPath, r.motivoDescarte, r.reporteOriginalId,
  r.fechaValidacion, r.fechaInicioReparacion, r.fechaResolucion,
  r.observacionesPersonal, r.creadoEn, r.actualizadoEn,
];

// Las columnas son snake_case (iguales a Supabase); aquí se pasan a camelCase para la app
const SELECT_REPORTE = `
  id, user_id AS userId, descripcion, tipo, gravedad, estado, referencia,
  latitud, longitud, ubicacion_confirmada AS ubicacionConfirmada,
  correo_ciudadano AS correoCiudadano, foto_uri AS fotoUri, foto_path AS fotoPath,
  motivo_descarte AS motivoDescarte, reporte_original_id AS reporteOriginalId,
  fecha_validacion AS fechaValidacion, fecha_inicio_reparacion AS fechaInicioReparacion,
  fecha_resolucion AS fechaResolucion, observaciones_personal AS observacionesPersonal,
  creado_en AS creadoEn, actualizado_en AS actualizadoEn,
  sync_estado AS syncEstado, sync_error AS syncError`;

export const listarReportes = (db: SQLiteDatabase) =>
  db.getAllAsync<Reporte>(`SELECT ${SELECT_REPORTE} FROM reportes ORDER BY creado_en DESC`);

export const obtenerReporte = (db: SQLiteDatabase, id: string) =>
  db.getFirstAsync<Reporte>(`SELECT ${SELECT_REPORTE} FROM reportes WHERE id = ?`, id);

export const pendientes = (db: SQLiteDatabase) =>
  db.getAllAsync<Reporte>(
    `SELECT ${SELECT_REPORTE} FROM reportes WHERE sync_estado IN ('pendiente_envio','error')`
  );

export const historialDe = (db: SQLiteDatabase, reporteId: string) =>
  db.getAllAsync<CambioEstado>(
    `SELECT id, reporte_id AS reporteId, estado_anterior AS estadoAnterior,
            nuevo_estado AS nuevoEstado, cambiado_en AS cambiadoEn, personal_id AS personalId
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
    `INSERT INTO historial_estados (reporte_id, estado_anterior, nuevo_estado, cambiado_en, personal_id)
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
       ubicacion_confirmada=?, correo_ciudadano=?, foto_uri=?, foto_path=?, actualizado_en=?,
       sync_estado='pendiente_envio', sync_error=NULL
     WHERE id=?`,
    r.descripcion, r.tipo, r.gravedad, r.referencia, r.latitud, r.longitud,
    r.ubicacionConfirmada, r.correoCiudadano, r.fotoUri, r.fotoPath, r.actualizadoEn, r.id
  );
}

export const eliminarReporte = (db: SQLiteDatabase, id: string) =>
  db.runAsync("DELETE FROM reportes WHERE id = ?", id);

export const marcarEnviado = (
  db: SQLiteDatabase,
  id: string,
  fotoPath: string | null,
  userId?: string | null
) =>
  db.runAsync(
    `UPDATE reportes SET sync_estado='enviado', sync_error=NULL, foto_path=?,
       user_id=COALESCE(?, user_id) WHERE id=?`,
    fotoPath, userId ?? null, id
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