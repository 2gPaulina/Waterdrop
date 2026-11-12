import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { registrarse } from '@/auth/acciones';
import { BotonPrincipal, CampoTexto, MensajeError } from '@/components/formulario';
import { GRIS } from '@/constants/colores';

const LARGO_MINIMO_CONTRASENA = 6;

function validar(nombre: string, correo: string, contrasena: string, confirmacion: string) {
  // Expresiones de control
  const letrasBasura = /(.)\1{3,}/i; // Evita "aaaaa", "sssss"
  const tieneNombreValido = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]{3,}$/;

  const nom = nombre.trim();
  if (!nom) return 'Escribe tu nombre.';
  if (nom.length < 3 || letrasBasura.test(nom) || !tieneNombreValido.test(nom)) {
    return 'Ingresa un nombre válido (mínimo 3 letras reales).';
  }

  const cor = correo.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cor)) {
    return 'Escribe un correo electrónico válido (ejemplo@dominio.com).';
  }

  if (contrasena.length < LARGO_MINIMO_CONTRASENA) {
    return `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`;
  }

  if (contrasena !== confirmacion) {
    return 'Las contraseñas no coinciden.';
  }

  return null;
}

export default function RegistroScreen() {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [correoEnviado, setCorreoEnviado] = useState(false);

  async function crearCuenta() {
    const problema = validar(nombre, correo, contrasena, confirmacion);
    if (problema) {
      setError(problema);
      return;
    }
    setError(null);
    setCargando(true);
    try {
      const { necesitaConfirmarCorreo } = await registrarse(nombre, correo, contrasena);
      setCorreoEnviado(necesitaConfirmarCorreo);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
    }
  }

  if (correoEnviado) {
    return (
      <ScrollView contentContainerStyle={styles.contenedor}>
        <Text style={styles.titulo}>Revisa tu correo</Text>
        <Text style={styles.texto}>
          Te enviamos un enlace a <Text style={styles.resaltado}>{correo.trim()}</Text>. Ábrelo para
          activar tu cuenta y después inicia sesión.
        </Text>
        <BotonPrincipal texto="Ir a iniciar sesión" onPress={() => router.back()} />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.contenedor} keyboardShouldPersistTaps="handled">
        <CampoTexto
          etiqueta="Nombre"
          value={nombre}
          onChangeText={setNombre}
          placeholder="Tu nombre"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
        />
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
          placeholder={`Mínimo ${LARGO_MINIMO_CONTRASENA} caracteres`}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <CampoTexto
          etiqueta="Confirmar contraseña"
          value={confirmacion}
          onChangeText={setConfirmacion}
          placeholder="Escríbela otra vez"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={crearCuenta}
        />

        <MensajeError texto={error} />
        <BotonPrincipal texto="Crear cuenta" onPress={crearCuenta} cargando={cargando} />
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
    padding: 24,
    gap: 16,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  texto: {
    fontSize: 16,
    color: GRIS,
  },
  resaltado: {
    color: '#000',
    fontWeight: '600',
  },
});
