
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  buscarReportes,
  cambiarEstado,
  crearReporte,
  obtenerDb,
  obtenerFugasCercanas,
  obtenerHistorial,
  type ClaveEstado,
  type ClaveGravedad,
  type ClaveTipoFuga,
  type ReporteDetalle,
} from '@/db';

// Centro de Pachuca
const LATITUD = 20.1011;
const LONGITUD = -98.7591;

const TIPOS: ClaveTipoFuga[] = ['tuberia_calzada', 'boca_riego', 'fuente_publica', 'alcantarilla', 'otro'];
const GRAVEDADES: ClaveGravedad[] = ['goteo', 'chorro', 'inundacion'];
const SIGUIENTE_ESTADO: Partial<Record<ClaveEstado, ClaveEstado>> = {
  recibido: 'validado',
  validado: 'en_reparacion',
  en_reparacion: 'resuelto',
};

function alAzar<T>(opciones: T[]): T {
  return opciones[Math.floor(Math.random() * opciones.length)];
}

export default function PruebaDbScreen() {
  const [reportes, setReportes] = useState<ReporteDetalle[]>([]);
  const [mensaje, setMensaje] = useState('Cargando base de datos...');

  async function recargar() {
    setReportes(await buscarReportes());
  }

  async function probar(nombre: string, accion: () => Promise<string>) {
    try {
      setMensaje(`✅ ${nombre}: ${await accion()}`);
    } catch (error) {
      setMensaje(`❌ ${nombre}: ${error instanceof Error ? error.message : String(error)}`);
    }
    await recargar();
  }

  useEffect(() => {
    probar('Abrir base de datos', async () => {
      await obtenerDb();
      return 'lista';
    });
  }, []);

  const ultimo = reportes[0];

  return (
    <ScrollView contentContainerStyle={styles.contenedor}>
      <Text style={styles.mensaje}>{mensaje}</Text>

      <Boton
        texto="Crear reporte de prueba"
        onPress={() =>
          probar('Crear reporte', async () => {
            const id = await crearReporte({
              fotoUri: 'file:///prueba.jpg',
              latitud: LATITUD + (Math.random() - 0.5) * 0.01,
              longitud: LONGITUD + (Math.random() - 0.5) * 0.01,
              ubicacionConfirmada: true,
              tipoFuga: alAzar(TIPOS),
              gravedad: alAzar(GRAVEDADES),
              descripcion: 'Reporte de prueba',
            });
            return `se creó el reporte #${id}`;
          })
        }
      />

      <Boton
        texto="Avanzar estado del último reporte"
        onPress={() =>
          probar('Avanzar estado', async () => {
            if (!ultimo) throw new Error('Primero crea un reporte.');
            const siguiente = SIGUIENTE_ESTADO[ultimo.estado];
            if (!siguiente) throw new Error(`El reporte ya está en "${ultimo.estado_nombre}".`);
            await cambiarEstado(ultimo.id, siguiente, { observaciones: 'Cambio de prueba' });
            return `#${ultimo.id} pasó a ${siguiente}`;
          })
        }
      />

      <Boton
        texto="Fugas activas cercanas (2 km)"
        onPress={() =>
          probar('Fugas cercanas', async () => {
            const fugas = await obtenerFugasCercanas(LATITUD, LONGITUD);
            return `${fugas.length} fuga(s) activa(s)`;
          })
        }
      />

      <Text style={styles.subtitulo}>Estas deben fallar</Text>

      <Boton
        texto="Crear reporte sin foto"
        onPress={() =>
          probar('Sin foto', async () => {
            await crearReporte({
              fotoUri: '',
              latitud: LATITUD,
              longitud: LONGITUD,
              ubicacionConfirmada: true,
              tipoFuga: 'otro',
              gravedad: 'goteo',
            });
            return 'se guardó (no debería)';
          })
        }
      />

      <Boton
        texto="Descartar el último sin motivo"
        onPress={() =>
          probar('Descartar sin motivo', async () => {
            if (!ultimo) throw new Error('Primero crea un reporte.');
            await cambiarEstado(ultimo.id, 'descartado');
            return 'se descartó (no debería)';
          })
        }
      />

      <Boton
        texto="Borrar el último reporte"
        onPress={() =>
          probar('Borrar reporte', async () => {
            if (!ultimo) throw new Error('Primero crea un reporte.');
            const db = await obtenerDb();
            await db.runAsync('DELETE FROM reportes WHERE id = ?', ultimo.id);
            return 'se borró (no debería)';
          })
        }
      />

      <Text style={styles.subtitulo}>Reportes guardados ({reportes.length})</Text>
      <Text style={styles.ayuda}>Toca un reporte para ver su historial.</Text>

      {reportes.map((r) => (
        <Pressable
          key={r.id}
          style={styles.tarjeta}
          onPress={() =>
            probar(`Historial #${r.id}`, async () => {
              const cambios = await obtenerHistorial(r.id);
              return cambios.map((c) => `${c.estado_anterior ?? '—'} → ${c.estado_nuevo}`).join(', ');
            })
          }>
          <Text style={styles.tarjetaTitulo}>
            #{r.id} · {r.tipo_fuga_nombre} · {r.gravedad_nombre}
          </Text>
          <Text>Estado: {r.estado_nombre}</Text>
          <Text style={styles.ayuda}>{new Date(r.fecha_reporte).toLocaleString()}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Boton({ texto, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]} onPress={onPress}>
      <Text style={styles.botonTexto}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    padding: 16,
    gap: 8,
  },
  subtitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
  },
  mensaje: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#E6F4FE',
  },
  ayuda: {
    color: '#666',
    fontSize: 12,
  },
  boton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#208AEF',
  },
  botonPresionado: {
    opacity: 0.7,
  },
  botonTexto: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
  tarjeta: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tarjetaTitulo: {
    fontWeight: '600',
  },
});
