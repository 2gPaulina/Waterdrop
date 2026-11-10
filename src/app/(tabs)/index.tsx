import { nombreDelUsuario, useSesion } from '@/auth/sesion';
import { EnConstruccion } from '@/components/en-construccion';

export default function ReportarScreen() {
  const { sesion } = useSesion();
  const saludo = sesion ? `Hola, ${nombreDelUsuario(sesion)}. ` : '';

  return (
    <EnConstruccion
      descripcion={`${saludo}Aquí el ciudadano registra una fuga nueva.`}
      pendientes={[
        'Tomar la foto de la fuga con la cámara (RF01)',
        'Obtener la ubicación GPS y mostrarla en un mapa (RF02)',
        'Dejar mover el punto si la ubicación no es exacta (RF03)',
        'Elegir tipo de fuga y gravedad (RF04, RF05)',
        'Descripción opcional (RF06)',
        'Guardar con crearReporte() de @/db',
      ]}
    />
  );
}
