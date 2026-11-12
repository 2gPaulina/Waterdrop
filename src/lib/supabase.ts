// Da un `localStorage` respaldado por SQLite, donde Supabase guarda la sesión.
import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;

const clavePublica =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !clavePublica) {
  throw new Error(
    'Faltan las variables de entorno de Supabase en el archivo .env. ' +
      'Asegúrate de definir EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY (o EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY).',
  );
}

export const supabase = createClient(url, clavePublica, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Renueva el token solo mientras la app está en primer plano.
AppState.addEventListener('change', (estado) => {
  if (estado === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});