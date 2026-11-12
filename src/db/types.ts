// Tipos de TypeScript que reflejan las tablas de schema.ts.
// SQLite no tiene booleanos: las columnas de tipo 0 | 1 son "sí/no".

export type ClaveTipoFuga =
  | 'tuberia_calzada'
  | 'boca_riego'
  | 'fuente_publica'
  | 'alcantarilla'
  | 'otro';

export type ClaveGravedad = 'goteo' | 'chorro' | 'inundacion';

export type ClaveEstado =
  | 'recibido'
  | 'validado'
  | 'en_reparacion'
  | 'resuelto'
  | 'duplicado'
  | 'descartado';

export type RolPersonal = 'administrador' | 'operador';

export interface TipoFuga {
  clave: ClaveTipoFuga;
  nombre: string;
}

export interface Gravedad {
  clave: ClaveGravedad;
  nombre: string;
  nivel: number;
}

export interface Estado {
  clave: ClaveEstado;
  nombre: string;
  activo: 0 | 1;
}

export interface Usuario {
  id: number;
  correo: string | null;
  creado_en: string;
}

export interface Personal {
  id: number;
  nombre: string;
  correo: string;
  contrasena_hash: string;
  rol: RolPersonal;
  creado_en: string;
}

export interface Reporte {
  id: number;
  usuario_id: number;
  foto_uri: string;
  descripcion: string | null;
  tipo_fuga: ClaveTipoFuga;
  gravedad: ClaveGravedad;
  estado: ClaveEstado;
  latitud: number;
  longitud: number;
  ubicacion_confirmada: 0 | 1;
  fecha_reporte: string;
  observaciones: string | null;
  motivo_descarte: string | null;
  reporte_original_id: number | null;
  fecha_validacion: string | null;
  fecha_inicio_reparacion: string | null;
  fecha_resolucion: string | null;
  sincronizado: 0 | 1;
  actualizado_en: string;
}

/** Reporte con los nombres legibles de sus catálogos, listo para mostrar en pantalla. */
export interface ReporteDetalle extends Reporte {
  tipo_fuga_nombre: string;
  gravedad_nombre: string;
  estado_nombre: string;
}

/** Lo único que se muestra en el mapa público: sin datos del ciudadano (RNF04). */
export interface FugaPublica {
  id: number;
  tipo_fuga: ClaveTipoFuga;
  gravedad: ClaveGravedad;
  estado: ClaveEstado;
  latitud: number;
  longitud: number;
  fecha_reporte: string;
}

export interface CambioEstado {
  id: number;
  reporte_id: number;
  estado_anterior: ClaveEstado | null;
  estado_nuevo: ClaveEstado;
  personal_id: number | null;
  personal_nombre: string | null;
  fecha_cambio: string;
}
