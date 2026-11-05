import { Pressable, StyleSheet, Text, View } from "react-native";

type Props<T extends string> = {
  opciones: { value: T; label: string }[];
  valor: T;
  onChange: (v: T) => void;
};

export function Chips<T extends string>({ opciones, valor, onChange }: Props<T>) {
  return (
    <View style={s.fila}>
      {opciones.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.chip, valor === o.value && s.activo]}>
          <Text style={[s.txt, valor === o.value && { color: "#fff" }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  fila: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#0284c7", backgroundColor: "#fff" },
  activo: { backgroundColor: "#0284c7" },
  txt: { color: "#0284c7", fontWeight: "600" },
});
