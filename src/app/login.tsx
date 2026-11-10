import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { iniciarSesion } from '@/auth/acciones';
import { BotonPrincipal, CampoTexto, MensajeError } from '@/components/formulario';
import { AZUL, GRIS } from '@/constants/colores';

export default function LoginScreen() {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar() {
    if (!correo.trim() || !contrasena) {
      setError('Escribe tu correo y tu contraseña.');
      return;
    }
    setError(null);
    setCargando(true);
    try {
      // Al haber sesión, el layout raíz manda a las pestañas por sí solo.
      await iniciarSesion(correo, contrasena);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.contenedor} keyboardShouldPersistTaps="handled">
        <View style={styles.encabezado}>
          <Text style={styles.titulo}>WaterDrop</Text>
          <Text style={styles.subtitulo}>Reporta fugas de agua en Pachuca</Text>
        </View>

        <CampoTexto
          etiqueta="Correo"
          value={correo}
          onChangeText={setCorreo}
          placeholder="tucorreo@ejemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <CampoTexto
          etiqueta="Contraseña"
          value={contrasena}
          onChangeText={setContrasena}
          placeholder="Tu contraseña"
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={entrar}
        />

        <MensajeError texto={error} />
        <BotonPrincipal texto="Iniciar sesión" onPress={entrar} cargando={cargando} />

        <Link href="/registro" style={styles.enlace}>
          ¿No tienes cuenta? <Text style={styles.enlaceResaltado}>Regístrate</Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: 'white',
  },
  contenedor: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  encabezado: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  titulo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: AZUL,
  },
  subtitulo: {
    color: GRIS,
  },
  enlace: {
    padding: 8,
    textAlign: 'center',
    color: GRIS,
  },
  enlaceResaltado: {
    color: AZUL,
    fontWeight: '600',
  },
});
