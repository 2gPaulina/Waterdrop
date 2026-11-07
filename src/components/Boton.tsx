import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

type Props = { titulo: string; onPress: () => void; color?: string; cargando?: boolean; secundario?: boolean };

export function Boton({ titulo, onPress, color = "#0284c7", cargando, secundario }: Props) {
  return (
    <Pressable onPress={onPress} disabled={cargando}
      style={[s.btn, secundario ? { borderWidth: 1.5, borderColor: color } : { backgroundColor: color }]}>
      {cargando ? <ActivityIndicator color={secundario ? color : "#fff"} /> :
        <Text style={[s.txt, secundario && { color }]}>{titulo}</Text>}
    </Pressable>
  );
}
const s = StyleSheet.create({
  btn: { paddingVertical: 13, borderRadius: 10, alignItems: "center" },
  txt: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
