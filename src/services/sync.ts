import type { SQLiteDatabase } from "expo-sqlite";
import { supabase } from "@/lib/supabase";
import { guardarRemoto, marcarEnviado, marcarError, pendientes } from "@/db/database";
import type { Reporte } from "@/types/reporte";

export async function sincronizar(db: SQLiteDatabase) {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("SIN_SESION");

  let enviados = 0;
  let errores = 0;

  for (const r of await pendientes(db)) {
    try {
      let path = r.fotoPath;
      if (r.fotoUri && !path) {
        const p = `${userId}/${r.id}.jpg`;
        const buf = await (await fetch(r.fotoUri)).arrayBuffer();
        const { error } = await supabase.storage
          .from("fotos")
          .upload(p, buf, { contentType: "image/jpeg", upsert: true });
        if (error) throw error;
        path = p;
      }
      // upsert por id: reintentar nunca crea duplicados
      const { error } = await supabase.from("reportes").upsert(
        {
          id: r.id,
          user_id: userId,
          descripcion: r.descripcion,
          tipo: r.tipo,
          gravedad: r.gravedad,
          estado: r.estado,
          referencia: r.referencia,
          latitud: r.latitud,
          longitud: r.longitud,
          foto_path: path,
          creado_en: r.creadoEn,
          actualizado_en: r.actualizadoEn,
        },
        { onConflict: "id" }
      );
      if (error) throw error;
      await marcarEnviado(db, r.id, path);
      enviados++;
    } catch (e: any) {
      await marcarError(db, r.id, e?.message ?? "Error desconocido");
      errores++;
    }
  }

  // Descargar reportes del usuario (otro dispositivo / cambios de estado)
  const { data: remotos, error } = await supabase.from("reportes").select("*");
  if (error) throw error;
  for (const x of remotos ?? []) {
    await guardarRemoto(db, {
      id: x.id,
      descripcion: x.descripcion,
      tipo: x.tipo,
      gravedad: x.gravedad,
      estado: x.estado,
      referencia: x.referencia,
      latitud: x.latitud,
      longitud: x.longitud,
      fotoUri: null,
      fotoPath: x.foto_path,
      creadoEn: x.creado_en,
      actualizadoEn: x.actualizado_en,
      syncEstado: "enviado",
      syncError: null,
    });
  }
  return { enviados, errores, recibidos: remotos?.length ?? 0 };
}

export async function urlFotoRemota(path: string) {
  const { data } = await supabase.storage.from("fotos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Borrado remoto "mejor esfuerzo" (si no hay internet, solo se borra local). */
export async function eliminarRemoto(r: Reporte) {
  try {
    await supabase.from("reportes").delete().eq("id", r.id);
    if (r.fotoPath) await supabase.storage.from("fotos").remove([r.fotoPath]);
  } catch {}
}
