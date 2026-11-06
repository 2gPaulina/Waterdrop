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
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import { Picker } from "@react-native-picker/picker";
import { supabase } from "../lib/supabase"; // Ajusta el path según tu estructura

export default function FormularioReporte() {
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState("Tubería en calzada");
  const [gravedad, setGravedad] = useState("Goteo");
  const [correoCiudadano, setCorreoCiudadano] = useState("");
  const [imagenUri, setImagenUri] = useState<string | null>(null);
  const [dispositivoId, setDispositivoId] = useState<string>("");

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
    // Generar un ID anónimo único para el dispositivo sin depender de paquetes externos
    const idAnonimo = `dev-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`;
    setDispositivoId(idAnonimo);

    obtenerUbicacionGPS();
  }, []);

  async function obtenerUbicacionGPS() {
    let { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      setUbicacionConfirmada(false);
      Alert.alert(
        "GPS desactivado 📍",
        "No se pudo acceder al GPS. Puedes pulsar o mover el pin en el mapa para fijar el lugar de la fuga.",
      );
      return;
    }

    let location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const nuevasCoords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    setCoordenadas(nuevasCoords);
    setRegion({
      ...nuevasCoords,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    });
    setUbicacionConfirmada(true);
  }

  function seleccionarEnMapa(e: any) {
    const coords = e.nativeEvent.coordinate;
    setCoordenadas(coords);
    setUbicacionConfirmada(true);
  }

  async function tomarFoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permiso denegado",
        "Se requiere permiso de cámara para continuar.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setImagenUri(result.assets?.[0]?.uri || null);
    }
  }

  async function seleccionarImagen() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setImagenUri(result.assets?.[0]?.uri || null);
    }
  }

  async function enviarReporte() {
    if (!descripcion || !imagenUri || !coordenadas) {
      Alert.alert(
        "Formulario incompleto ⚠️",
        "Por favor adjunta una fotografía, verifica la posición en el mapa y añade una descripción.",
      );
      return;
    }

    setCargando(true);

    try {
      // Conversión de imagen local a Blob
      const fotoResponse = await fetch(imagenUri);
      const blob = await fotoResponse.blob();

      const nombreArchivo = `fuga-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("fugas")
        .upload(nombreArchivo, blob, { contentType: "image/jpeg" });

      if (uploadError)
        throw new Error("Error al subir archivo: " + uploadError.message);

      const { data: urlData } = supabase.storage
        .from("fugas")
        .getPublicUrl(nombreArchivo);

      // Inserción en la tabla de Supabase con todos los requerimientos
      const { error: insertError } = await supabase.from("reportes").insert([
        {
          descripcion: descripcion,
          tipo: tipo,
          gravedad: gravedad,
          estado: "Recibido",
          latitud: coordenadas.latitude,
          longitud: coordenadas.longitude,
          ubicacion_confirmada: ubicacionConfirmada,
          imagen_url: urlData.publicUrl,
          dispositivo_id: dispositivoId,
          correo_ciudadano: correoCiudadano || null,
        },
      ]);

      if (insertError)
        throw new Error("Error al registrar reporte: " + insertError.message);

      Alert.alert("¡Enviado con éxito! ✅", "Tu reporte ha sido registrado.");

      // Limpieza del formulario
      setDescripcion("");
      setCorreoCiudadano("");
      setImagenUri(null);
    } catch (err: any) {
      Alert.alert("Error ❌", err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Reportar Fuga de Agua</Text>

      {/* GPS Status */}
      <View style={styles.headerUbicacion}>
        <Text style={styles.label}>
          Ubicación: {coordenadas ? "✅ Confirmada" : "⚠️ Selecciona un punto"}
        </Text>
        <Button title="🔄 GPS" onPress={obtenerUbicacionGPS} color="#0288d1" />
      </View>

      {/* Mapa interactivo */}
      <Text style={styles.sublabel}>
        Toca o arrastra el marcador para ajustar el lugar:
      </Text>
      <View style={styles.mapaContainer}>
        <MapView
          style={styles.mapa}
          region={region}
          onPress={seleccionarEnMapa}
        >
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

      {/* Tipo de Fuga */}
      <Text style={styles.label}>Tipo de fuga</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={tipo} onValueChange={(val) => setTipo(val)}>
          <Picker.Item label="Tubería en calzada" value="Tubería en calzada" />
          <Picker.Item label="Boca de riego" value="Boca de riego" />
          <Picker.Item label="Fuente pública" value="Fuente pública" />
          <Picker.Item label="Alcantarilla" value="Alcantarilla" />
          <Picker.Item label="Otro" value="Otro" />
        </Picker>
      </View>

      {/* Gravedad */}
      <Text style={styles.label}>Gravedad</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={gravedad}
          onValueChange={(val) => setGravedad(val)}
        >
          <Picker.Item label="Goteo" value="Goteo" />
          <Picker.Item label="Chorro" value="Chorro" />
          <Picker.Item label="Inundación" value="Inundación" />
        </Picker>
      </View>

      {/* Descripción */}
      <Text style={styles.label}>Descripción</Text>
      <TextInput
        style={styles.input}
        placeholder="Añade detalles sobre la fuga..."
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
      />

      {/* Correo Opcional */}
      <Text style={styles.label}>Correo electrónico (Opcional)</Text>
      <TextInput
        style={styles.inputEmail}
        placeholder="ejemplo@correo.com"
        value={correoCiudadano}
        onChangeText={setCorreoCiudadano}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Botones de Imagen */}
      <View style={styles.botonesFotoContainer}>
        <View style={styles.mitadBoton}>
          <Button title="📸 Cámara" onPress={tomarFoto} color="#0288d1" />
        </View>
        <View style={styles.mitadBoton}>
          <Button
            title="🖼️ Galería"
            onPress={seleccionarImagen}
            color="#0288d1"
          />
        </View>
      </View>

      {imagenUri && (
        <Image source={{ uri: imagenUri }} style={styles.imagenPreview} />
      )}

      {/* Botón de Enviar */}
      <View style={styles.botonEspaciado}>
        {cargando ? (
          <ActivityIndicator size="large" color="#0288d1" />
        ) : (
          <Button
            title="🚀 Enviar Reporte"
            onPress={enviarReporte}
            color="#2e7d32"
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#fff",
    paddingBottom: 50,
  },
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
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 5,
  },
  sublabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  mapaContainer: {
    height: 200,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  mapa: {
    width: "100%",
    height: "100%",
  },
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
  mitadBoton: {
    width: "48%",
  },
  botonEspaciado: {
    marginTop: 20,
    marginBottom: 5,
  },
  imagenPreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 10,
  },
});
