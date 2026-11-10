import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { EnConstruccion } from '@/components/en-construccion';

export default function MisReportesScreen() {
  return (
    <EnConstruccion
      descripcion="Lista de los reportes que hizo el ciudadano y el estado de cada uno."
      pendientes={[
        'Listar los reportes con buscarReportes() (RF08, RF09)',
        'Abrir el detalle con obtenerReporte() y obtenerHistorial() (RF12)',
        'Filtrar por estado y fecha (RF11)',
      ]}>
      <Link href="/prueba-db" style={styles.enlace}>
        Abrir prueba de base de datos
      </Link>
    </EnConstruccion>
  );
}

const styles = StyleSheet.create({
  enlace: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#208AEF',
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
});
