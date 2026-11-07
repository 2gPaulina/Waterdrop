import * as SQLite from 'expo-sqlite';

export type Tipo = 'tuberia' | 'boca_riego' | 'fuente' | 'alcantarilla' | 'otro';
export type Gravedad = 'goteo' | 'chorro' | 'inundacion'; 
export type EstadoProceso = 'pendiente' | 'en_revision' | 'resuelto';
export type EstadoSync = 'pendiente_envio' |  'enviado' | 'error';

export interface ReporteLocal {
  id?: number;
  identificador_dispositivo: string;
  correo_ciudadano?: string;
  fotografia_uri?: string;
  fecha: string;
  hora: string;
  descripcion: string;
  tipo_fuga: Tipo;
  gravedad: Gravedad;
  latitud: number;
  longitud: number;
  ubicacion_confirmada: number;
  estado_actual: EstadoProceso;
  motivo_descarte?: string;
  reporte_original_id?: string;
  synced: number;
}

export const getDB = async () => {
  return await SQLite.openDatabaseAsync('waterdrop.db');
};

export const initDB = async () => {
  const db = await getDB();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS reportes_locales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identificador_dispositivo TEXT NOT NULL,
      correo_ciudadano TEXT,
      fotografia_uri TEXT,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      tipo_fuga TEXT NOT NULL,
      gravedad TEXT NOT NULL,
      latitud REAL NOT NULL,
      longitud REAL NOT NULL,
      ubicacion_confirmada INTEGER DEFAULT 0,
      estado_actual TEXT DEFAULT 'recibido',
      motivo_descarte TEXT,
      reporte_original_id TEXT,
      synced INTEGER DEFAULT 0
    );
  `);
};

export const crearReporte = async (reporte: Omit<ReporteLocal, 'id' | 'synced'>) => {
  const db = await getDB();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `INSERT INTO reportes_locales (
        identificador_dispositivo, correo_ciudadano, fotografia_uri, fecha, hora,
        descripcion, tipo_fuga, gravedad, latitud, longitud, ubicacion_confirmada,
        estado_actual, motivo_descarte, reporte_original_id, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
      [
        reporte.identificador_dispositivo,
        reporte.correo_ciudadano || '',
        reporte.fotografia_uri || '',
        reporte.fecha,
        reporte.hora,
        reporte.descripcion,
        reporte.tipo_fuga,
        reporte.gravedad,
        reporte.latitud,
        reporte.longitud,
        reporte.ubicacion_confirmada,
        reporte.estado_actual || 'recibido',
        reporte.motivo_descarte || '',
        reporte.reporte_original_id || ''
      ]
    );
  });
};

export const obtenerReportes = async (): Promise<ReporteLocal[]> => {
  const db = await getDB();
  return await db.getAllAsync<ReporteLocal>(
    'SELECT * FROM reportes_locales ORDER BY id DESC;'
  );
};

// Consultar un reporte por ID
export const obtenerReportePorId = async (id: number): Promise<ReporteLocal | null> => {
  const db = await getDB();
  return await db.getFirstAsync<ReporteLocal>(
    'SELECT * FROM reportes_locales WHERE id = ?;',
    [id]
  );
};

export const actualizarEstadoSynced = async (id: number) => {
  const db = await getDB();  
  await db.runAsync(
    'UPDATE reportes_locales SET synced = 1 WHERE id = ?;',
    [id]
  );
};

export const eliminarReporte = async (id: number) => {
  const db = await getDB();
  await db.runAsync(
    'DELETE FROM reportes_locales WHERE id = ?;',
    [id]
  );
};