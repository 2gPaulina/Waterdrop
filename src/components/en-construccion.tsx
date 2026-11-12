import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = {
  descripcion: string;
  pendientes: string[];
  children?: ReactNode;
};

/** Pantalla provisional que dice qué falta construir. Reemplácenla al hacer la pantalla real. */
export function EnConstruccion({ descripcion, pendientes, children }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.contenedor}>
      <Text style={styles.etiqueta}>EN CONSTRUCCIÓN</Text>
      <Text style={styles.descripcion}>{descripcion}</Text>

      <View style={styles.lista}>
        <Text style={styles.subtitulo}>Por hacer</Text>
        {pendientes.map((pendiente) => (
          <Text key={pendiente} style={styles.item}>
            • {pendiente}
          </Text>
        ))}
      </View>

      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    padding: 16,
    gap: 16,
  },
  etiqueta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#FFF3CD',
    color: '#856404',
    fontSize: 12,
    fontWeight: 'bold',
  },
  descripcion: {
    fontSize: 16,
  },
  lista: {
    gap: 6,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F2',
  },
  subtitulo: {
    fontWeight: 'bold',
  },
  item: {
    color: '#333',
  },
});
