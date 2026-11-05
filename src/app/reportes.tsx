import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { ReportCard } from "@/components/ReportCard";
import { Boton } from "@/components/Boton";
import { listarReportes } from "@/db/database";
import { useSync } from "@/hooks/useSync";
import type { Reporte } from "@/types/reporte";

export default function Reportes() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [lista, setLista] = useState<Reporte[]>([]);
  const cargar = useCallback(async () => setLista(await listarReportes(db)), [db]);
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));
  const { sync, sincronizando } = useSync(cargar);

  return (
    <View style={s.cont}>
      <FlatList
        data={lista}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <ReportCard reporte={item} onPress={() => router.push({ pathname: "/reporte/[id]", params: { id: item.id } })} />
        )}
        ListEmptyComponent={<Text style={s.vacio}>Aún no hay reportes. Toca "Nuevo reporte" para crear el primero.</Text>}
        contentContainerStyle={{ flexGrow: 1 }}
      />
      <View style={{ gap: 8 }}>
        <Boton titulo="Sincronizar" color="#16a34a" cargando={sincronizando} onPress={sync} />
        <Boton titulo="Nuevo reporte" onPress={() => router.push("/formulario")} />
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  cont: { flex: 1, padding: 16, backgroundColor: "#f0f9ff", gap: 8 },
  vacio: { textAlign: "center", marginTop: 60, color: "#6b7280", fontSize: 16 },
});
