import type { SQLiteDatabase } from "expo-sqlite";
import type { Reporte } from "@/types/reporte";

export async function initDb(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS reportes (
      id TEXT PRIMARY KEY NOT NULL,
      descripcion TEXT NOT NULL,
      tipo TEXT NOT NULL,
      gravedad TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      referencia TEXT NOT NULL,
      latitud REAL,
      longitud REAL,
      fotoUri TEXT,
      fotoPath TEXT,
      creadoEn TEXT NOT NULL,
      actualizadoEn TEXT NOT NULL,
      syncEstado TEXT NOT NULL DEFAULT 'pendiente_envio',
      syncError TEXT
    );
  `);
}

export const listarReportes = (db: SQLiteDatabase) =>
  db.getAllAsync<Reporte>("SELECT * FROM reportes ORDER BY creadoEn DESC");

export const obtenerReporte = (db: SQLiteDatabase, id: string) =>
  db.getFirstAsync<Reporte>("SELECT * FROM reportes WHERE id = ?", id);

export const pendientes = (db: SQLiteDatabase) =>
  db.getAllAsync<Reporte>("SELECT * FROM reportes WHERE syncEstado IN ('pendiente_envio','error')");

export async function crearReporte(db: SQLiteDatabase, r: Reporte) {
  await db.runAsync(
    `INSERT INTO reportes (id,descripcion,tipo,gravedad,estado,referencia,latitud,longitud,fotoUri,fotoPath,creadoEn,actualizadoEn,syncEstado,syncError)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pendiente_envio',NULL)`,
    r.id, r.descripcion, r.tipo, r.gravedad, r.estado, r.referencia, r.latitud, r.longitud,
    r.fotoUri, r.fotoPath, r.creadoEn, r.actualizadoEn
  );
}

export async function actualizarReporte(db: SQLiteDatabase, r: Reporte) {
  await db.runAsync(
    `UPDATE reportes SET descripcion=?,tipo=?,gravedad=?,estado=?,referencia=?,latitud=?,longitud=?,
     fotoUri=?,fotoPath=?,actualizadoEn=?,syncEstado='pendiente_envio',syncError=NULL WHERE id=?`,
    r.descripcion, r.tipo, r.gravedad, r.estado, r.referencia, r.latitud, r.longitud,
    r.fotoUri, r.fotoPath, r.actualizadoEn, r.id
  );
}

export const eliminarReporte = (db: SQLiteDatabase, id: string) =>
  db.runAsync("DELETE FROM reportes WHERE id = ?", id);

export const marcarEnviado = (db: SQLiteDatabase, id: string, fotoPath: string | null) =>
  db.runAsync("UPDATE reportes SET syncEstado='enviado', syncError=NULL, fotoPath=? WHERE id=?", fotoPath, id);

export const marcarError = (db: SQLiteDatabase, id: string, msg: string) =>
  db.runAsync("UPDATE reportes SET syncEstado='error', syncError=? WHERE id=?", msg, id);

/** Guarda lo que viene de Supabase; si ya existe solo refresca el estado del proceso. */
export const guardarRemoto = (db: SQLiteDatabase, r: Reporte) =>
  db.runAsync(
    `INSERT INTO reportes (id,descripcion,tipo,gravedad,estado,referencia,latitud,longitud,fotoUri,fotoPath,creadoEn,actualizadoEn,syncEstado,syncError)
     VALUES (?,?,?,?,?,?,?,?,NULL,?,?,?,'enviado',NULL)
     ON CONFLICT(id) DO UPDATE SET estado=excluded.estado WHERE reportes.syncEstado='enviado'`,
    r.id, r.descripcion, r.tipo, r.gravedad, r.estado, r.referencia, r.latitud, r.longitud,
    r.fotoPath, r.creadoEn, r.actualizadoEn
  );
