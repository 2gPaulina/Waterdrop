/** Fecha y hora actual en UTC, con el mismo formato que `new Date().toISOString()`. */
export const AHORA = `(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

/**
 * Cada elemento del arreglo es una versión del esquema (v1, v2, ...).
 * Nunca edites una migración que ya corrió en un teléfono: agrega una nueva al final.
 */
export const MIGRACIONES: string[] = [
  // v1: esquema inicial según "Datos Principales" del documento del proyecto.
  `
  -- Catálogos ---------------------------------------------------------------

  CREATE TABLE tipos_fuga (
    clave  TEXT PRIMARY KEY NOT NULL,
    nombre TEXT NOT NULL
  );

  INSERT INTO tipos_fuga (clave, nombre) VALUES
    ('tuberia_calzada', 'Tubería en calzada'),
    ('boca_riego',      'Boca de riego'),
    ('fuente_publica',  'Fuente pública'),
    ('alcantarilla',    'Alcantarilla'),
    ('otro',            'Otro');

  CREATE TABLE gravedades (
    clave  TEXT PRIMARY KEY NOT NULL,
    nombre TEXT NOT NULL,
    nivel  INTEGER NOT NULL UNIQUE
  );

  INSERT INTO gravedades (clave, nombre, nivel) VALUES
    ('goteo',      'Goteo',      1),
    ('chorro',     'Chorro',     2),
    ('inundacion', 'Inundación', 3);

  -- activo = 1 si la fuga sigue sin resolver y debe aparecer en el mapa (RF10).
  CREATE TABLE estados (
    clave  TEXT PRIMARY KEY NOT NULL,
    nombre TEXT NOT NULL,
    activo INTEGER NOT NULL CHECK (activo IN (0, 1))
  );

  INSERT INTO estados (clave, nombre, activo) VALUES
    ('recibido',      'Recibido',      1),
    ('validado',      'Validado',      1),
    ('en_reparacion', 'En reparación', 1),
    ('resuelto',      'Resuelto',      0),
    ('duplicado',     'Duplicado',     0),
    ('descartado',    'Descartado',    0);

  -- Personas ----------------------------------------------------------------

  -- Ciudadano dueño del dispositivo. El correo es opcional.
  CREATE TABLE usuarios (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    correo    TEXT UNIQUE,
    creado_en TEXT NOT NULL DEFAULT ${AHORA}
  );

  -- Personal de CAASIM que valida y atiende los reportes.
  CREATE TABLE personal (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre          TEXT NOT NULL,
    correo          TEXT NOT NULL UNIQUE,
    contrasena_hash TEXT NOT NULL,
    rol             TEXT NOT NULL CHECK (rol IN ('administrador', 'operador')),
    creado_en       TEXT NOT NULL DEFAULT ${AHORA}
  );

  -- Reportes ----------------------------------------------------------------

  CREATE TABLE reportes (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT, -- RF07
    usuario_id              INTEGER NOT NULL REFERENCES usuarios (id),
    foto_uri                TEXT NOT NULL CHECK (trim(foto_uri) <> ''), -- RNF09
    descripcion             TEXT,
    tipo_fuga               TEXT NOT NULL REFERENCES tipos_fuga (clave),
    gravedad                TEXT NOT NULL REFERENCES gravedades (clave),
    estado                  TEXT NOT NULL DEFAULT 'recibido' REFERENCES estados (clave),
    latitud                 REAL NOT NULL CHECK (latitud BETWEEN -90 AND 90),
    longitud                REAL NOT NULL CHECK (longitud BETWEEN -180 AND 180),
    ubicacion_confirmada    INTEGER NOT NULL DEFAULT 0 CHECK (ubicacion_confirmada IN (0, 1)),
    fecha_reporte           TEXT NOT NULL DEFAULT ${AHORA}, -- fecha y hora juntas

    -- Gestión por parte del personal
    observaciones           TEXT,
    motivo_descarte         TEXT,
    reporte_original_id     INTEGER REFERENCES reportes (id),
    fecha_validacion        TEXT,
    fecha_inicio_reparacion TEXT,
    fecha_resolucion        TEXT,

    -- Modo offline: 0 = falta subirlo al servidor
    sincronizado            INTEGER NOT NULL DEFAULT 0 CHECK (sincronizado IN (0, 1)),
    actualizado_en          TEXT NOT NULL DEFAULT ${AHORA},

    CHECK (estado <> 'descartado' OR trim(coalesce(motivo_descarte, '')) <> ''), -- RF18
    CHECK (estado <> 'duplicado' OR reporte_original_id IS NOT NULL),            -- RF15
    CHECK (reporte_original_id IS NULL OR reporte_original_id <> id)
  );

  CREATE INDEX idx_reportes_usuario      ON reportes (usuario_id, fecha_reporte);
  CREATE INDEX idx_reportes_estado_fecha ON reportes (estado, fecha_reporte); -- RF11
  CREATE INDEX idx_reportes_ubicacion    ON reportes (latitud, longitud);     -- RF10

  -- RF19: los reportes nunca se borran, solo cambian de estado.
  CREATE TRIGGER reportes_no_eliminar
  BEFORE DELETE ON reportes
  BEGIN
    SELECT RAISE(ABORT, 'Los reportes no se eliminan; cambia su estado a descartado o resuelto.');
  END;

  CREATE TRIGGER reportes_actualizado_en
  AFTER UPDATE ON reportes
  FOR EACH ROW WHEN NEW.actualizado_en = OLD.actualizado_en
  BEGIN
    UPDATE reportes SET actualizado_en = ${AHORA} WHERE id = NEW.id;
  END;

  -- Historial ---------------------------------------------------------------

  -- Un renglón por cada cambio de estado. personal_id es NULL cuando el cambio
  -- lo hizo el sistema (por ejemplo, al crear el reporte).
  CREATE TABLE historial_estados (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    reporte_id      INTEGER NOT NULL REFERENCES reportes (id),
    estado_anterior TEXT REFERENCES estados (clave),
    estado_nuevo    TEXT NOT NULL REFERENCES estados (clave),
    personal_id     INTEGER REFERENCES personal (id),
    fecha_cambio    TEXT NOT NULL DEFAULT ${AHORA}
  );

  CREATE INDEX idx_historial_reporte ON historial_estados (reporte_id, fecha_cambio);
  `,
];
