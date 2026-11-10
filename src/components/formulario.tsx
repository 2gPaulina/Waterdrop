import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { AZUL, ROJO } from '@/constants/colores';

export function CampoTexto({ etiqueta, ...props }: TextInputProps & { etiqueta: string }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <TextInput style={styles.input} placeholderTextColor="#999" {...props} />
    </View>
  );
}

type BotonProps = {
  texto: string;
  onPress: () => void;
  cargando?: boolean;
};

export function BotonPrincipal({ texto, onPress, cargando = false }: BotonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.boton, (pressed || cargando) && styles.botonPresionado]}
      onPress={onPress}
      disabled={cargando}>
      {cargando ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={styles.botonTexto}>{texto}</Text>
      )}
    </Pressable>
  );
}

export function MensajeError({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return <Text style={styles.error}>{texto}</Text>;
}

const styles = StyleSheet.create({
  campo: {
    gap: 6,
  },
  etiqueta: {
    fontWeight: '600',
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    fontSize: 16,
    color: '#000',
    backgroundColor: 'white',
  },
  boton: {
    minHeight: 48,
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: AZUL,
  },
  botonPresionado: {
    opacity: 0.7,
  },
  botonTexto: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FDECEA',
    color: ROJO,
  },
});
