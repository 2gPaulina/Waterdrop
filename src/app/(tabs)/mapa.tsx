import { EnConstruccion } from '@/components/en-construccion';

export default function MapaScreen() {
  return (
    <EnConstruccion
      descripcion="Mapa con las fugas activas cerca del ciudadano (RF10)."
      pendientes={[
        'Pedir permiso de ubicación con expo-location',
        'Mostrar en el mapa las fugas de obtenerFugasCercanas()',
        'No mostrar datos personales del ciudadano (RNF04)',
      ]}
    />
  );
}
