import { SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';

import { SesionProvider, useSesion } from '@/auth/sesion';

// La pantalla de inicio se queda visible hasta saber si hay sesión guardada.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SesionProvider>
      <Navegacion />
    </SesionProvider>
  );
}

function Navegacion() {
  const { sesion, cargando } = useSesion();

  useEffect(() => {
    if (!cargando) {
      SplashScreen.hide();
    }
  }, [cargando]);

  // Cuando cambia la sesión, Expo Router saca al usuario de las pantallas que
  // ya no le tocan: al entrar va a las pestañas y al salir regresa al login.
  return (
    <Stack>
      <Stack.Protected guard={!!sesion}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="prueba-db" options={{ title: 'Prueba de base de datos' }} />
      </Stack.Protected>

      <Stack.Protected guard={!sesion}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="registro" options={{ title: 'Crear cuenta' }} />
      </Stack.Protected>
    </Stack>
  );
}
