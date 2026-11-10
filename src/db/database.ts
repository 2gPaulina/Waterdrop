import * as SQLite from 'expo-sqlite';

import { MIGRACIONES } from './schema';

export const NOMBRE_BD = 'waterdrop.db';

let conexion: Promise<SQLite.SQLiteDatabase> | null = null;

/** Abre la base de datos una sola vez y la deja lista para usarse. */
export function obtenerDb(): Promise<SQLite.SQLiteDatabase> {
  if (!conexion) {
    conexion = SQLite.openDatabaseAsync(NOMBRE_BD)
      .then(async (db) => {
        await inicializarDb(db);
        return db;
      })
      .catch((error) => {
        conexion = null;
        throw error;
      });
  }
  return conexion;
}

/**
 * Activa las llaves foráneas y corre las migraciones pendientes.
 * También sirve como `onInit` de `<SQLiteProvider>` si prefieren usar `useSQLiteContext()`.
 */
export async function inicializarDb(db: SQLite.SQLiteDatabase): Promise<void> {
  // SQLite trae las llaves foráneas apagadas y hay que activarlas en cada conexión.
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const fila = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const versionActual = fila?.user_version ?? 0;

  if (versionActual === 0) {
    await db.execAsync('PRAGMA journal_mode = WAL;');
  }

  for (let version = versionActual; version < MIGRACIONES.length; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRACIONES[version]);
      await db.execAsync(`PRAGMA user_version = ${version + 1};`);
    });
  }
}
