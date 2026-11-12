import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { randomUUID } from "expo-crypto";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import { Picker } from "@react-native-picker/picker";
import { crearReporte, obtenerReporte } from "@/db/database";
import { elegirFoto, guardarFotoPermanente } from "@/services/foto";
import { sincronizar } from "@/services/sync";
import {
  TIPOS,
  GRAVEDADES,
  type Tipo,
  type Gravedad,
  type Reporte,
} from "@/types/reporte";
import { cerrarSesion } from "@/auth/acciones";
import NetInfo from '@react-native-community/netinfo';

type Errores = {
  descripcion?: string;
  referencia?: string;
  correo?: string;
  foto?: string;
  ubicacion?: string;
};

export default function FormularioReporte() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState<Tipo>("tuberia");
  const [gravedad, setGravedad] = useState<Gravedad>("goteo");
  const [referencia, setReferencia] = useState("");
  const [correoCiudadano, setCorreoCiudadano] = useState("");
  const [imagenUri, setImagenUri] = useState<string | null>(null);
  const [errores, setErrores] = useState<Errores>({});

  // Coordenadas iniciales por defecto (CDMX / Referencia)
  const [region, setRegion] = useState({
    latitude: 19.432608,
    longitude: -99.133209,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  const [coordenadas, setCoordenadas] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [ubicacionConfirmada, setUbicacionConfirmada] = useState(false);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
  const intentarSincronizar = async () => {
    try {
      await sincronizar(db);
    } catch {
      // Manejo silencioso en segundo plano
    }
  };

  // 1) Intentar sincronizar al entrar a la pantalla
  intentarSincronizar();

  // 2) Listener de red: en cuanto el celular detecte internet, sube DE INMEDIATO
  const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      intentarSincronizar();
    }
  });

  // 3) Temporizador periódicos cada 15 minutos (900,000 ms) como respaldo
  const MINUTOS_15 = 15 * 60 * 1000;
  const intervaloId = setInterval(intentarSincronizar, MINUTOS_15);

  return () => {
    unsubscribeNetInfo();
    clearInterval(intervaloId);
    };
  }, [db]);

  async function obtenerUbicacionGPS() {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      setUbicacionConfirmada(false);
      Alert.alert(
        "GPS desactivado 📍",
        "No se pudo acceder al GPS. Puedes pulsar o mover el pin en el mapa para fijar el lugar de la fuga.",
      );
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const nuevasCoords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    setCoordenadas(nuevasCoords);
    setRegion({ ...nuevasCoords, latitudeDelta: 0.005, longitudeDelta: 0.005 });
    // El GPS solo propone el punto; el ciudadano lo confirma
    setUbicacionConfirmada(false);
  }

  const handleCerrarSesion = async () => {
  Alert.alert("Cerrar Sesión", "¿Estás seguro de que deseas salir?", [
    { text: "Cancelar", style: "cancel" },
    {
      text: "Salir",
      style: "destructive",
      onPress: async () => {
        try {
          await cerrarSesion();
        } catch (error: any) {
          Alert.alert("Error", error?.message ?? "No se pudo cerrar la sesión.");
        }
      },
    },
  ]);
};

  // Tocar o arrastrar el pin cuenta como confirmación del ciudadano
  function seleccionarEnMapa(e: any) {
    setCoordenadas(e.nativeEvent.coordinate);
    setUbicacionConfirmada(true);
  }

  async function foto(origen: "camara" | "galeria") {
    try {
      const uri = await elegirFoto(origen);
      if (uri) setImagenUri(uri);
    } catch {
      Alert.alert(
        "Permiso denegado",
        origen === "camara"
          ? "Sin permiso de cámara no puedes tomar la foto. Puedes elegir una de la galería o activar el permiso en Ajustes."
          : "No se pudo abrir la galería.",
      );
    }
  }

  function validar(): boolean {
    const e: Errores = {};

    // Detecta 4 o más caracteres idénticos consecutivos (ej. ssss, dddd)
    const letrasBasura = /(.)\1{3,}/i;
    // Valida que contenga palabras normales con o sin acentos
    const tienePalabrasValidas = /[a-zA-ZáéíóúÁÉÍÓÚñÑ]{3,}/;

    // 1. Descripción
    const desc = descripcion.trim();
    if (desc.length < 10) {
      e.descripcion = "Describe la fuga con al menos 10 caracteres.";
    } else if (letrasBasura.test(desc) || !tienePalabrasValidas.test(desc)) {
      e.descripcion = "Por favor ingresa una descripción válida en texto comprensible.";
    }

    // 2. Referencia (Opcional)
    const ref = referencia.trim();
    if (ref.length > 0) {
      if (ref.length < 3) {
        e.referencia = "La referencia debe tener al menos 3 caracteres.";
      } else if (letrasBasura.test(ref) || !tienePalabrasValidas.test(ref)) {
        e.referencia = "Ingresa una referencia válida (ej. entre qué calles o colonia).";
      }
    }

    // 3. Correo (Opcional)
    const correo = correoCiudadano.trim();
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      e.correo = "Ingresa un correo electrónico válido (ejemplo@dominio.com).";
    }

    // 4. Ubicación y Foto
    if (!imagenUri) e.foto = "Adjunta una fotografía de la fuga.";

    if (!coordenadas) {
      e.ubicacion = "Selecciona la ubicación en el mapa.";
    } else if (!ubicacionConfirmada) {
      e.ubicacion = "Confirma la ubicación con el botón o tocando el mapa.";
    }

    setErrores(e);
    return Object.keys(e).length === 0;
  }

  async function enviarReporte() {
    if (!validar()) return;

    setCargando(true);
    try {
      const ahora = new Date().toISOString();
      const id = randomUUID();

      const r: Reporte = {
        id,
        descripcion: descripcion.trim(),
        tipo,
        gravedad,
        estado: "recibido",
        referencia: referencia.trim(),
        latitud: coordenadas!.latitude,
        longitud: coordenadas!.longitude,
        ubicacionConfirmada: ubicacionConfirmada ? 1 : 0,
        correoCiudadano: correoCiudadano.trim() || null,
        fotoUri: guardarFotoPermanente(imagenUri!, id),
        fotoPath: null,
        motivoDescarte: null,
        reporteOriginalId: null,
        fechaValidacion: null,
        fechaInicioReparacion: null,
        fechaResolucion: null,
        observacionesPersonal: null,
        creadoEn: ahora,
        actualizadoEn: ahora,
        syncEstado: "pendiente_envio",
        syncError: null,
      };

      // 1) Guardar siempre en SQLite
      await crearReporte(db, r);

      // 2) Intentar subir a Supabase (si no hay sesión o internet, queda pendiente)
      try {
        await sincronizar(db);
      } catch {}

      // 3) Revisar si este reporte realmente se envió
      const guardado = await obtenerReporte(db, id);
      if (guardado?.syncEstado === "enviado") {
        Alert.alert("¡Enviado con éxito! ✅", "Tu reporte ha sido registrado.");
      } else {
        Alert.alert(
          "Guardado en el dispositivo 📱",
          "No se pudo enviar al servidor (sin internet o sin sesión). Tu reporte quedó guardado; envíalo desde Mis reportes con el botón Sincronizar.",
        );
      }

      // Limpieza del formulario
      setDescripcion("");
      setReferencia("");
      setCorreoCiudadano("");
      setImagenUri(null);
      setUbicacionConfirmada(false);
      setErrores({});
    } catch (err: any) {
      Alert.alert("Error ❌", err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.titulo}>Reportar Fuga de Agua</Text>

      {/* GPS Status */}
      <View style={styles.headerUbicacion}>
        <Text style={styles.label}>
          Ubicación:{" "}
          {!coordenadas
            ? "⚠️ Selecciona un punto"
            : ubicacionConfirmada
              ? "✅ Confirmada"
              : "📍 Sin confirmar"}
        </Text>
        <Button title="🔄 GPS" onPress={obtenerUbicacionGPS} color="#0288d1" />
      </View>

      {/* Mapa interactivo */}
      <Text style={styles.sublabel}>
        Toca o arrastra el marcador para ajustar el lugar:
      </Text>
      <View style={styles.mapaContainer}>
        <MapView style={styles.mapa} region={region} onPress={seleccionarEnMapa}>
          {coordenadas && (
            <Marker
              coordinate={coordenadas}
              draggable
              onDragEnd={seleccionarEnMapa}
              title="Lugar de la fuga"
            />
          )}
        </MapView>
      </View>

      {coordenadas && !ubicacionConfirmada && (
        <Button
          title="✅ Confirmar ubicación"
          onPress={() => setUbicacionConfirmada(true)}
          color="#2e7d32"
        />
      )}
      {errores.ubicacion && <Text style={styles.error}>{errores.ubicacion}</Text>}

      {/* Tipo de Fuga */}
      <Text style={styles.label}>Tipo de fuga</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={tipo} onValueChange={(val) => setTipo(val)}>
          {TIPOS.map((t) => (
            <Picker.Item key={t.value} label={t.label} value={t.value} />
          ))}
        </Picker>
      </View>

      {/* Gravedad */}
      <Text style={styles.label}>Gravedad</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={gravedad} onValueChange={(val) => setGravedad(val)}>
          {GRAVEDADES.map((g) => (
            <Picker.Item key={g.value} label={g.label} value={g.value} />
          ))}
        </Picker>
      </View>

      {/* Descripción */}
      <Text style={styles.label}>Descripción</Text>
      <TextInput
        style={[styles.input, errores.descripcion && styles.inputError]}
        placeholder="Añade detalles sobre la fuga..."
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
      />
      {errores.descripcion && <Text style={styles.error}>{errores.descripcion}</Text>}

      {/* Referencia (opcional) */}
      <Text style={styles.label}>Referencia del lugar (Opcional)</Text>
      <TextInput
        style={styles.inputEmail}
        placeholder="Calle, colonia, entre qué calles"
        value={referencia}
        onChangeText={setReferencia}
      />

      {/* Correo Opcional */}
      <Text style={styles.label}>Correo electrónico (Opcional)</Text>
      <TextInput
        style={[styles.inputEmail, errores.correo && styles.inputError]}
        placeholder="ejemplo@correo.com"
        value={correoCiudadano}
        onChangeText={setCorreoCiudadano}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {errores.correo && <Text style={styles.error}>{errores.correo}</Text>}

      {/* Botones de Imagen */}
      <View style={styles.botonesFotoContainer}>
        <View style={styles.mitadBoton}>
          <Button title="📸 Cámara" onPress={() => foto("camara")} color="#0288d1" />
        </View>
        <View style={styles.mitadBoton}>
          <Button title="🖼️ Galería" onPress={() => foto("galeria")} color="#0288d1" />
        </View>
      </View>
      {errores.foto && <Text style={styles.error}>{errores.foto}</Text>}

      {imagenUri && <Image source={{ uri: imagenUri }} style={styles.imagenPreview} />}

      {/* Botón de Enviar */}
      <View style={styles.botonEspaciado}>
        {cargando ? (
          <ActivityIndicator size="large" color="#0288d1" />
        ) : (
          <Button title="🚀 Enviar Reporte" onPress={enviarReporte} color="#2e7d32" />
        )}
      </View>

      <View style={styles.botonEspaciado}>
        <Button
          title="📋 Mis reportes"
          onPress={() => router.push("/reportes")}
          color="#0288d1"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: "#fff", paddingBottom: 50 },
  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#1565c0",
  },
  headerUbicacion: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },
  label: { fontSize: 16, fontWeight: "600", marginTop: 10, marginBottom: 5 },
  sublabel: { fontSize: 13, color: "#666", marginBottom: 8 },
  mapaContainer: {
    height: 200,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  mapa: { width: "100%", height: "100%" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 70,
    textAlignVertical: "top",
    backgroundColor: "#f9f9f9",
  },
  inputEmail: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  inputError: { borderColor: "#dc2626" },
  error: { color: "#dc2626", fontSize: 13, marginTop: 4 },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    marginBottom: 10,
  },
  botonesFotoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    marginBottom: 5,
  },
  mitadBoton: { width: "48%" },
  botonEspaciado: { marginTop: 20, marginBottom: 5 },
  imagenPreview: { width: "100%", height: 200, borderRadius: 8, marginTop: 10 },
});