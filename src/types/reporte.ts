export type Tipo = "tuberia" | "boca_riego" | "fuente" | "alcantarilla" | "otro";
export type Gravedad = "goteo" | "chorro" | "inundacion";
export type EstadoProceso =
  | "recibido" | "validado" | "en_reparacion"
  | "resuelto" | "duplicado" | "descartado";
export type EstadoSync = "pendiente_envio" | "enviado" | "error";

export interface Reporte {
  id: string;
  descripcion: string;
  tipo: Tipo;
  gravedad: Gravedad;
  estado: EstadoProceso;
  referencia: string;
  latitud: number | null;
  longitud: number | null;
  ubicacionConfirmada: number; // 0 | 1
  correoCiudadano: string | null;
  fotoUri: string | null; // archivo local
  fotoPath: string | null; // ruta en Supabase Storage
  motivoDescarte: string | null;
  reporteOriginalId: string | null;
  fechaValidacion: string | null;
  fechaInicioReparacion: string | null;
  fechaResolucion: string | null;
  observacionesPersonal: string | null;
  creadoEn: string; // ISO: fecha y hora del reporte
  actualizadoEn: string;
  syncEstado: EstadoSync;
  syncError: string | null;
}

export interface CambioEstado {
  id: number;
  reporteId: string;
  estadoAnterior: EstadoProceso | null;
  nuevoEstado: EstadoProceso;
  cambiadoEn: string;
  personalId: string | null;
}

export const TIPOS: { value: Tipo; label: string }[] = [
  { value: "tuberia", label: "Tubería en calzada" },
  { value: "boca_riego", label: "Boca de riego" },
  { value: "fuente", label: "Fuente pública" },
  { value: "alcantarilla", label: "Alcantarilla" },
  { value: "otro", label: "Otro" },
];
export const GRAVEDADES: { value: Gravedad; label: string }[] = [
  { value: "goteo", label: "Goteo" },
  { value: "chorro", label: "Chorro" },
  { value: "inundacion", label: "Inundación" },
];
export const ESTADOS: { value: EstadoProceso; label: string; color: string }[] = [
  { value: "recibido", label: "Recibido", color: "#d97706" },
  { value: "validado", label: "Validado", color: "#2563eb" },
  { value: "en_reparacion", label: "En reparación", color: "#7c3aed" },
  { value: "resuelto", label: "Resuelto", color: "#16a34a" },
  { value: "duplicado", label: "Duplicado", color: "#6b7280" },
  { value: "descartado", label: "Descartado", color: "#dc2626" },
];
export const SYNCS: { value: EstadoSync; label: string; color: string }[] = [
  { value: "pendiente_envio", label: "Por enviar", color: "#6b7280" },
  { value: "enviado", label: "Enviado", color: "#16a34a" },
  { value: "error", label: "Error de envío", color: "#dc2626" },
];
export const labelTipo = (v: Tipo) => TIPOS.find((t) => t.value === v)?.label ?? v;
export const labelGravedad = (v: Gravedad) => GRAVEDADES.find((t) => t.value === v)?.label ?? v;