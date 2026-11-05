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
import { supabase } from "../lib/supabase";

export default function FormularioCompleto() {
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState("Tubería en calzada");
  const [gravedad, setGravedad] = useState("Goteo");
  const [imagenUri, setImagenUri] = useState<string | null>(null);

  // Coordenadas iniciales (por defecto si falla el GPS)
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
  const [permisoUbicacion, setPermisoUbicacion] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Solicitar ubicación exacta por GPS al abrir
  async function obtenerUbicacion() {
    let { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      setPermisoUbicacion(false);
      Alert.alert(
        "Permiso requerido 📍",
        "No se otorgó permiso de GPS. Puedes seleccionar la ubicación manualmente en el mapa.",
      );
      return;
    }

    setPermisoUbicacion(true);
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
  }

  useEffect(() => {
    obtenerUbicacion();
  }, []);

  // Seleccionar ubicación tocando o moviendo el pin en el mapa
  function seleccionarEnMapa(e: any) {
    const coords = e.nativeEvent.coordinate;
    setCoordenadas(coords);
    setPermisoUbicacion(true); // Se marca como confirmada manualmente
  }

  // Tomar foto con la cámara
  async function tomarFoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permiso denegado",
        "Necesitas dar permiso para usar la cámara.",
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

  // Seleccionar de la galería
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

  // Enviar reporte
  async function enviarReporte() {
    if (!descripcion || !imagenUri || !coordenadas) {
      Alert.alert(
        "Atención ⚠️",
        "Es obligatorio definir la ubicación en el mapa, subir una foto y escribir una descripción.",
      );
      return;
    }

    setCargando(true);

    try {
      const fotoResponse = await fetch(imagenUri);
      const blob = await fotoResponse.blob();

      const nombreArchivo = `fuga-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("fugas")
        .upload(nombreArchivo, blob, { contentType: "image/jpeg" });

      if (uploadError)
        throw new Error("Error al subir foto: " + uploadError.message);

      const { data: urlData } = supabase.storage
        .from("fugas")
        .getPublicUrl(nombreArchivo);

      const { error: insertError } = await supabase.from("reportes").insert([
        {
          descripcion: descripcion,
          tipo: tipo,
          gravedad: gravedad,
          latitud: coordenadas.latitude,
          longitud: coordenadas.longitude,
          imagen_url: urlData.publicUrl,
          ubicacion_confirmada: true,
        },
      ]);

      if (insertError)
        throw new Error("Error al guardar: " + insertError.message);

      Alert.alert("¡Éxito! ✅", "Reporte enviado correctamente.");

      setDescripcion("");
      setImagenUri(null);
    } catch (err: any) {
      Alert.alert("Error ❌", err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Reportar Fuga</Text>

      {/* Indicador y botón para reintentar GPS */}
      <View style={styles.headerUbicacion}>
        <Text style={styles.label}>
          Ubicación:{" "}
          {coordenadas ? "✅ Confirmada" : "⚠️ Selecciona en el mapa"}
        </Text>
        <Button
          title="🔄 Reintentar GPS"
          onPress={obtenerUbicacion}
          color="#0288d1"
        />
      </View>

      {/* MAPA INTERACTIVO */}
      <Text style={styles.sublabel}>
        Toca en el mapa para ajustar el punto exacto:
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
          <Picker.Item label="Medidor" value="Medidor" />
          <Picker.Item label="Llave de paso" value="Llave de paso" />
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
        placeholder="Ej: Fuga de agua frente al número 102..."
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
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

      {/* Botón de envío */}
      <View style={styles.botonEspaciado}>
        {cargando ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <Button
            title="🚀 Enviar Reporte Completo"
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
    padding: 15,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
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
    marginTop: 10,
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
