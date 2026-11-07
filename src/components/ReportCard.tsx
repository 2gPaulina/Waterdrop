import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ESTADOS, SYNCS, labelGravedad, labelTipo, type Reporte } from "@/types/reporte";
import { StatusBadge } from "./StatusBadge";

type Props = { reporte: Reporte; onPress: () => void };

export function ReportCard({ reporte: r, onPress }: Props) {
  const estado = ESTADOS.find((e) => e.value === r.estado)!;
  const sync = SYNCS.find((e) => e.value === r.syncEstado)!;
  return (
    <Pressable onPress={onPress} style={s.card}>
      {r.fotoUri ? (
        <Image source={{ uri: r.fotoUri }} style={s.foto} />
      ) : (
        <View style={[s.foto, s.sinFoto]}><Text style={{ fontSize: 28 }}>💧</Text></View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.titulo}>{labelTipo(r.tipo)} · {labelGravedad(r.gravedad)}</Text>
        <Text numberOfLines={2} style={s.desc}>{r.descripcion}</Text>
        <Text style={s.fecha}>{new Date(r.creadoEn).toLocaleString()}</Text>
        <View style={s.fila}>
          <StatusBadge label={estado.label} color={estado.color} />
          <StatusBadge label={sync.label} color={sync.color} />
        </View>
      </View>
    </Pressable>
  );
}
const s = StyleSheet.create({
  card: { flexDirection: "row", gap: 12, padding: 12, backgroundColor: "#fff", borderRadius: 12, marginBottom: 10, elevation: 2, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4 },
  foto: { width: 80, height: 80, borderRadius: 8 },
  sinFoto: { backgroundColor: "#e0f2fe", alignItems: "center", justifyContent: "center" },
  titulo: { fontWeight: "700", fontSize: 15 },
  desc: { color: "#374151" },
  fecha: { color: "#6b7280", fontSize: 12 },
  fila: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
});
