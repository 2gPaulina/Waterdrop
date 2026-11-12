import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { supabase } from '@/lib/supabase';

type EstadoSesion = {
  sesion: Session | null;
  /** true mientras se lee la sesión guardada en el teléfono. */
  cargando: boolean;
};

const SesionContext = createContext<EstadoSesion | null>(null);

export function SesionProvider({ children }: PropsWithChildren) {
  const [estado, setEstado] = useState<EstadoSesion>({ sesion: null, cargando: true });

  useEffect(() => {
    // Supabase avisa la sesión guardada al suscribirse y después cada login o logout.
    const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      setEstado({ sesion, cargando: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <SesionContext.Provider value={estado}>{children}</SesionContext.Provider>;
}

export function useSesion(): EstadoSesion {
  const valor = use(SesionContext);
  if (!valor) {
    throw new Error('useSesion debe usarse dentro de <SesionProvider>.');
  }
  return valor;
}

/** El nombre que dio al registrarse, o su correo si no hay nombre. */
export function nombreDelUsuario(sesion: Session): string {
  const nombre: unknown = sesion.user.user_metadata.nombre;
  return typeof nombre === 'string' && nombre ? nombre : (sesion.user.email ?? '');
}
