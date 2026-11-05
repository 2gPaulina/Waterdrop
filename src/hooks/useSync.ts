import { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { sincronizar } from "@/services/sync";

export function useSync(onDone?: () => void) {
  const db = useSQLiteContext();
  const router = useRouter();
  const [sincronizando, setSincronizando] = useState(false);

  const sync = async () => {
    setSincronizando(true);
    try {
      const r = await sincronizar(db);
      Alert.alert(
        "Sincronización",
        `Enviados: ${r.enviados}\nCon error: ${r.errores}\nRecibidos de la nube: ${r.recibidos}`
      );
    } catch (e: any) {
      if (e?.message === "SIN_SESION") {
        Alert.alert("Inicia sesión", "Necesitas una cuenta para enviar tus reportes.", [
          { text: "Cancelar", style: "cancel" },
          { text: "Iniciar sesión", onPress: () => router.push("/login") },
        ]);
      } else {
        Alert.alert("Sin conexión", "No se pudo sincronizar. Tus reportes siguen guardados en el celular; intenta de nuevo con internet.");
      }
    } finally {
      setSincronizando(false);
      onDone?.();
    }
  };
  return { sync, sincronizando };
}
