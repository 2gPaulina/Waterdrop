import { useCallback, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Boton } from "@/components/Boton";
import { StatusBadge } from "@/components/StatusBadge";
import { eliminarReporte, obtenerReporte } from "@/db/database";
import { eliminarRemoto, urlFotoRemota } from "@/services/sync";
import { ESTADOS, SYNCS, labelGravedad, labelTipo, type Reporte } from "@/types/reporte";

export default function Detalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const [r, setR] = useState<Reporte | null>(null);
  const [foto, setFoto] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    obtenerReporte(db, id).then(async (x) => {
      setR(x ?? null);
      if (x?.fotoUri) setFoto(x.fotoUri);
      else if (x?.fotoPath) setFoto(await urlFotoRemota(x.fotoPath).catch(() => null));
    });
  }, [db, id]));

  if (!r) return <Text style={{ padding: 20 }}>Reporte no encontrado.</Text>;
  const estado = ESTADOS.find((e) => e.value === r.estado)!;
  const sync = SYNCS.find((e) => e.value === r.syncEstado)!;

  const borrar = () =>
    Alert.alert("Eliminar reporte", "¿Seguro que quieres eliminarlo?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
          if (r.syncEstado === "enviado") await eliminarRemoto(r);
          await eliminarReporte(db, r.id);
          router.back();
      } },
    ]);

  return (
    <ScrollView contentContainerStyle={s.cont}>
      {foto && <Image source={{ uri: foto }} style={s.foto} />}
      <Text style={s.titulo}>{labelTipo(r.tipo)} · {labelGravedad(r.gravedad)}</Text>
      <View style={s.fila}>
        <StatusBadge label={estado.label} color={estado.color} />
        <StatusBadge label={sync.label} color={sync.color} />
      </View>
      {r.syncError && <Text style={{ color: "#dc2626" }}>Error: {r.syncError}</Text>}
      <Text style={s.k}>Descripción</Text><Text>{r.descripcion}</Text>
      <Text style={s.k}>Referencia</Text><Text>{r.referencia}</Text>
      <Text style={s.k}>Coordenadas</Text>
      <Text>{r.latitud != null ? `${r.latitud.toFixed(5)}, ${r.longitud?.toFixed(5)}` : "Sin GPS (solo referencia escrita)"}</Text>
      <Text style={s.k}>Creado</Text><Text>{new Date(r.creadoEn).toLocaleString()}</Text>
      <Text style={s.k}>ID</Text><Text style={{ fontSize: 12 }}>{r.id}</Text>
      <View style={{ height: 8 }} />
      <Boton titulo="Editar" onPress={() => router.push({ pathname: "/formulario", params: { id: r.id } })} />
      <Boton titulo="Eliminar" color="#dc2626" secundario onPress={borrar} />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  cont: { padding: 16, gap: 6, backgroundColor: "#f0f9ff" },
  foto: { width: "100%", height: 240, borderRadius: 12, marginBottom: 6 },
  titulo: { fontSize: 22, fontWeight: "800" },
  fila: { flexDirection: "row", gap: 6, marginVertical: 4 },
  k: { fontWeight: "700", marginTop: 8, color: "#0369a1" },
});
