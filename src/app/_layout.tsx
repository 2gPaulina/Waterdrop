import { ActivityIndicator, View } from 'react-native';
import { SplashScreen, Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { useEffect } from 'react';

import { SesionProvider, useSesion } from '@/auth/sesion';
import { initDb, NOMBRE_BD } from '@/db/database';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={NOMBRE_BD} onInit={initDb}>
      <SesionProvider>
        <Navegacion />
      </SesionProvider>
    </SQLiteProvider>
  );
}

function Navegacion() {
  const { sesion, cargando } = useSesion();

  useEffect(() => {
    if (!cargando) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [cargando]);

  // Si aún está resolviendo la sesión de SQLite/Supabase, muestra un cargando en vez de pantalla blanca
  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#0288d1" />
      </View>
    );
  }

  return (
    <Stack>
      {/* 🔒 PANTALLAS PROTEGIDAS (Solo cuando SÍ hay sesión) */}
      <Stack.Protected guard={!!sesion}>
        <Stack.Screen name="index" options={{ title: 'Reportar Fuga' }} />
        <Stack.Screen name="formulario" options={{ title: 'Reporte de fuga' }} />
        <Stack.Screen name="reportes" options={{ title: 'Mis reportes' }} />
        <Stack.Screen name="reporte/[id]" options={{ title: 'Detalle del reporte' }} />
        <Stack.Screen name="prueba-db" options={{ title: 'Prueba de base de datos' }} />
      </Stack.Protected>

      {/* 🔓 PANTALLAS PÚBLICAS (Solo cuando NO hay sesión) */}
      <Stack.Protected guard={!sesion}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="registro" options={{ title: 'Crear cuenta' }} />
      </Stack.Protected>
    </Stack>
  );
}