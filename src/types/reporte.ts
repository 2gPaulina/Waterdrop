export type Tipo = "tuberia" | "boca_riego" | "fuente" | "alcantarilla" | "otro";
export type Gravedad = "goteo" | "chorro" | "inundacion";
export type EstadoProceso = "pendiente" | "en_revision" | "resuelto";
export type EstadoSync = "pendiente_envio" | "enviado" | "error";

export interface Reporte {
  id: string; // UUID generado en el celular (evita duplicados al reintentar)
  descripcion: string;
  tipo: Tipo;
  gravedad: Gravedad;
  estado: EstadoProceso;
  referencia: string;
  latitud: number | null;
  longitud: number | null;
  fotoUri: string | null; // archivo local
  fotoPath: string | null; // ruta en Supabase Storage
  creadoEn: string; // ISO
  actualizadoEn: string;
  syncEstado: EstadoSync;
  syncError: string | null;
}

export const TIPOS: { value: Tipo; label: string }[] = [
  { value: "tuberia", label: "Tubería en calle" },
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
  { value: "pendiente", label: "Pendiente", color: "#d97706" },
  { value: "en_revision", label: "En revisión", color: "#2563eb" },
  { value: "resuelto", label: "Resuelto", color: "#16a34a" },
];
export const SYNCS: { value: EstadoSync; label: string; color: string }[] = [
  { value: "pendiente_envio", label: "Por enviar", color: "#6b7280" },
  { value: "enviado", label: "Enviado", color: "#16a34a" },
  { value: "error", label: "Error de envío", color: "#dc2626" },
];
export const labelTipo = (v: Tipo) => TIPOS.find((t) => t.value === v)?.label ?? v;
export const labelGravedad = (v: Gravedad) => GRAVEDADES.find((t) => t.value === v)?.label ?? v;
