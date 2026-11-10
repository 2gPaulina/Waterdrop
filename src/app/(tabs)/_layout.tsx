import { Tabs } from 'expo-router/js-tabs';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { cerrarSesion } from '@/auth/acciones';
import { AZUL } from '@/constants/colores';

function BotonSalir() {
  function confirmar() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () =>
          cerrarSesion().catch((error: Error) =>
            Alert.alert('No se pudo cerrar sesión', error.message),
          ),
      },
    ]);
  }

  return (
    <Pressable onPress={confirmar} hitSlop={8} style={styles.salir}>
      <Text style={styles.salirTexto}>Salir</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: AZUL, headerRight: () => <BotonSalir /> }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Reportar',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'plus.circle', android: 'add_circle', web: 'add_circle' }}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="mis-reportes"
        options={{
          title: 'Mis reportes',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'list.bullet',
                android: 'format_list_bulleted',
                web: 'format_list_bulleted',
              }}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'map', android: 'map', web: 'map' }} tintColor={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  salir: {
    marginRight: 16,
  },
  salirTexto: {
    color: AZUL,
    fontSize: 16,
    fontWeight: '600',
  },
});
