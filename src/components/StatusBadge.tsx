import { StyleSheet, Text, View } from "react-native";

type Props = { label: string; color: string };

export function StatusBadge({ label, color }: Props) {
  return (
    <View style={[s.box, { borderColor: color, backgroundColor: color + "22" }]}>
      <Text style={[s.txt, { color }]}>{label}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  txt: { fontSize: 12, fontWeight: "600" },
});
