import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Boton } from "@/components/Boton";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);

  const valido = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { Alert.alert("Correo inválido", "Escribe un correo válido."); return false; }
    if (password.length < 6) { Alert.alert("Contraseña corta", "Mínimo 6 caracteres."); return false; }
    return true;
  };

  const entrar = async () => {
    if (!valido()) return;
    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setCargando(false);
    if (error) Alert.alert("No se pudo entrar", error.message); else router.back();
  };

  const registrar = async () => {
    if (!valido()) return;
    setCargando(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    setCargando(false);
    if (error) return Alert.alert("No se pudo crear la cuenta", error.message);
    if (!data.session) Alert.alert("Revisa tu correo", "Confirma tu cuenta y luego inicia sesión.");
    else router.back();
  };

  return (
    <View style={s.cont}>
      <Text style={s.t}>Inicia sesión para sincronizar tus reportes</Text>
      <TextInput style={s.input} placeholder="Correo" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={s.input} placeholder="Contraseña" secureTextEntry value={password} onChangeText={setPassword} />
      <Boton titulo="Entrar" cargando={cargando} onPress={entrar} />
      <Boton titulo="Crear cuenta" secundario onPress={registrar} />
    </View>
  );
}
const s = StyleSheet.create({
  cont: { flex: 1, padding: 24, gap: 12, justifyContent: "center", backgroundColor: "#f0f9ff" },
  t: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, padding: 12 },
});
