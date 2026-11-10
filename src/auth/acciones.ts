import { isAuthError, isAuthRetryableFetchError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

// Mensajes en español para los códigos de error de Supabase Auth.
const MENSAJES: Record<string, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Primero confirma tu correo. Revisa tu bandeja de entrada.',
  user_already_exists: 'Ya existe una cuenta con ese correo.',
  email_exists: 'Ya existe una cuenta con ese correo.',
  weak_password: 'La contraseña es muy débil. Usa al menos 6 caracteres.',
  email_address_invalid: 'Ese correo no es válido.',
  over_email_send_rate_limit: 'Se enviaron demasiados correos. Espera unos minutos.',
  over_request_rate_limit: 'Demasiados intentos. Espera unos minutos.',
  signup_disabled: 'El registro de cuentas está desactivado.',
};

function traducirError(error: unknown): Error {
  if (isAuthRetryableFetchError(error)) {
    return new Error('No hay conexión con el servidor. Revisa tu internet.');
  }
  if (isAuthError(error) && error.code && MENSAJES[error.code]) {
    return new Error(MENSAJES[error.code]);
  }
  return error instanceof Error ? error : new Error(String(error));
}

export async function iniciarSesion(correo: string, contrasena: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: correo.trim(),
    password: contrasena,
  });
  if (error) throw traducirError(error);
}

export interface ResultadoRegistro {
  /** true si Supabase pide confirmar el correo antes de poder entrar. */
  necesitaConfirmarCorreo: boolean;
}

export async function registrarse(
  nombre: string,
  correo: string,
  contrasena: string,
): Promise<ResultadoRegistro> {
  const { data, error } = await supabase.auth.signUp({
    email: correo.trim(),
    password: contrasena,
    options: { data: { nombre: nombre.trim() } },
  });
  if (error) throw traducirError(error);

  // Con la confirmación de correo activa, Supabase no marca error si el correo ya
  // estaba registrado: regresa un usuario sin identidades.
  if (data.user?.identities?.length === 0) {
    throw new Error(MENSAJES.user_already_exists);
  }
  return { necesitaConfirmarCorreo: !data.session };
}

export async function cerrarSesion(): Promise<void> {
  // "local" borra la sesión del teléfono aunque no haya internet.
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw traducirError(error);
}
