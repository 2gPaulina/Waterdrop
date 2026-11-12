import type { SQLiteDatabase } from "expo-sqlite";
import { supabase } from "@/lib/supabase";
import { guardarRemoto, marcarEnviado, marcarError, pendientes } from "@/db/database";
import type { EstadoProceso, Gravedad, Reporte, Tipo } from "@/types/reporte";
import NetInfo from '@react-native-community/netinfo';

const BUCKET = "fugas";

// La app usa ids internos; la nube usa enums con estas etiquetas
const TIPO_REMOTO: Record<Tipo, string> = {
  tuberia: "Tubería en calzada",
  boca_riego: "Boca de riego",
  fuente: "Fuente pública",
  alcantarilla: "Alcantarilla",
  otro: "Otro",
};
const GRAVEDAD_REMOTO: Record<Gravedad, string> = {
  goteo: "Goteo",
  chorro: "Chorro",
  inundacion: "Inundación",
};
const ESTADO_REMOTO: Record<EstadoProceso, string> = {
  recibido: "Recibido",
  validado: "Validado",
  en_reparacion: "En reparación",
  resuelto: "Resuelto",
  duplicado: "Duplicado",
  descartado: "Descartado",
};

const invertir = <T extends string>(m: Record<T, string>) =>
  Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k])) as Record<string, T>;
const TIPO_LOCAL = invertir(TIPO_REMOTO);
const GRAVEDAD_LOCAL = invertir(GRAVEDAD_REMOTO);
const ESTADO_LOCAL = invertir(ESTADO_REMOTO);

export async function sincronizar(db: SQLiteDatabase) {
  // 0) Comprobar red ANTES de intentar cualquier operación remota
  const netState = await NetInfo.fetch();
  if (!netState.isConnected || !netState.isInternetReachable) {
    // Sin conexión no ejecutamos sync ni marcamos error en la BD local
    return { enviados: 0, errores: 0, recibidos: 0 };
  }

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("SIN_SESION");

  let enviados = 0;
  let errores = 0;

  for (const r of await pendientes(db)) {
    try {
      // 1) Foto al bucket, dentro de la carpeta del usuario
      let path = r.fotoPath;
      if (r.fotoUri && !path) {
        const p = `${userId}/${r.id}.jpg`;
        const buf = await (await fetch(r.fotoUri)).arrayBuffer();
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(p, buf, { contentType: "image/jpeg" });
        // Si un intento anterior ya la subió, se da por buena
        const yaExiste = !!error && /already exists|duplicate/i.test(error.message);
        if (error && !yaExiste) throw new Error(`[foto] ${error.message}`);
        path = p;
      }

      // 2) Ciudadano (el correo vive en la tabla ciudadanos)
      const { error: cErr } = await supabase.from("ciudadanos").upsert(
        r.correoCiudadano
          ? { id: userId, correo_electronico: r.correoCiudadano }
          : { id: userId },
        { onConflict: "id" }
      );
      if (cErr) throw new Error(`[ciudadanos] ${cErr.message}`);

      // 3) Reporte. No se manda estado ni campos del personal: los maneja la nube
      const { error } = await supabase.from("reportes").upsert(
        {
          id: r.id,
          ciudadano_id: userId,
          fotografia_url: path,
          imagen_url: path
            ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
            : null,
          fecha_hora: r.creadoEn,
          descripcion: r.descripcion,
          tipo: TIPO_REMOTO[r.tipo],
          gravedad: GRAVEDAD_REMOTO[r.gravedad],
          latitud: r.latitud,
          longitud: r.longitud,
          ubicacion_confirmada: r.ubicacionConfirmada === 1,
        },
        { onConflict: "id" }
      );
      if (error) throw new Error(`[reportes] ${error.message}`);

      await marcarEnviado(db, r.id, path, userId);
      enviados++;
    } catch (e: any) {
      console.log("SYNC ERROR", r.id, e?.message);
      await marcarError(db, r.id, e?.message ?? "Error desconocido");
      errores++;
    }
  }

  // Descargar los reportes del ciudadano (cambios de estado hechos por el personal)
  const { data: remotos, error } = await supabase
    .from("reportes")
    .select("*")
    .eq("ciudadano_id", userId);
  if (error) throw error;

  for (const x of remotos ?? []) {
    await guardarRemoto(db, {
      id: x.id,
      userId: x.ciudadano_id,
      descripcion: x.descripcion ?? "",
      tipo: TIPO_LOCAL[x.tipo] ?? "otro",
      gravedad: GRAVEDAD_LOCAL[x.gravedad] ?? "goteo",
      estado: ESTADO_LOCAL[x.estado] ?? "recibido",
      referencia: "",
      latitud: x.latitud,
      longitud: x.longitud,
      ubicacionConfirmada: x.ubicacion_confirmada ? 1 : 0,
      correoCiudadano: null,
      fotoUri: null,
      fotoPath: x.fotografia_url,
      motivoDescarte: x.motivo_descarte ?? null,
      reporteOriginalId: x.reporte_original_id ?? null,
      fechaValidacion: x.fecha_validacion ?? null,
      fechaInicioReparacion: x.fecha_inicio_reparacion ?? null,
      fechaResolucion: x.fecha_resolucion ?? null,
      observacionesPersonal: x.observaciones_personal ?? null,
      creadoEn: x.fecha_hora,
      actualizadoEn: x.fecha_hora,
      syncEstado: "enviado",
      syncError: null,
    });
  }
  return { enviados, errores, recibidos: remotos?.length ?? 0 };
}

// El bucket es público, así que la URL se arma directamente
export async function urlFotoRemota(path: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Borrado remoto "mejor esfuerzo" (si no hay internet, solo se borra local). */
export async function eliminarRemoto(r: Reporte) {
  try {
    await supabase.from("reportes").delete().eq("id", r.id);
    if (r.fotoPath) await supabase.storage.from(BUCKET).remove([r.fotoPath]);
  } catch {}
}