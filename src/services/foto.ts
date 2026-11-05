import * as ImagePicker from "expo-image-picker";
import { File, Paths } from "expo-file-system";

/** Devuelve la URI temporal elegida, null si cancela; lanza "PERMISO" si lo niegan. */
export async function elegirFoto(origen: "camara" | "galeria"): Promise<string | null> {
  if (origen === "camara") {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) throw new Error("PERMISO");
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6 });
    return r.canceled ? null : r.assets[0].uri;
  }
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
  return r.canceled ? null : r.assets[0].uri;
}

/** Copia la foto a la carpeta permanente de la app para que sobreviva al reinicio. */
export function guardarFotoPermanente(uri: string, id: string): string {
  const destino = new File(Paths.document, `${id}-${Date.now()}.jpg`);
  new File(uri).copy(destino);
  return destino.uri;
}
