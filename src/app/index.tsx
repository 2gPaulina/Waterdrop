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
import { Picker } from "@react-native-picker/picker";
import { supabase } from "../lib/supabase"; // Ajusta tu ruta si es necesario

export default function FormularioCompleto() {
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState("Tubería en calzada");
  const [gravedad, setGravedad] = useState("Goteo");
  const [imagenUri, setImagenUri] = useState<string | null>(null);
  const [ubicacion, setUbicacion] = useState<any>(null);
  const [cargando, setCargando] = useState(false);

  // Solicitar permisos de GPS al cargar la pantalla
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permiso denegado",
          "Se necesita acceso a la ubicación para reportar la fuga.",
        );
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUbicacion(location.coords);
    })();
  }, []);

  // 1. Tomar foto con la cámara
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

  // 2. Seleccionar de la galería
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

  // 3. Enviar datos a Supabase
  async function enviarReporte() {
    if (!descripcion || !imagenUri || !ubicacion) {
      Alert.alert(
        "Atención",
        "Faltan datos. Asegúrate de poner una descripción, tomar/elegir una foto y esperar la ubicación GPS.",
      );
      return;
    }

    setCargando(true);

    try {
      // Convertir la imagen a Blob
      const fotoResponse = await fetch(imagenUri);
      const blob = await fotoResponse.blob();

      // Subir archivo al Storage
      const nombreArchivo = `fuga-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("fugas")
        .upload(nombreArchivo, blob, { contentType: "image/jpeg" });

      if (uploadError) {
        throw new Error("Error al subir la imagen: " + uploadError.message);
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from("fugas")
        .getPublicUrl(nombreArchivo);

      // Guardar en la base de datos
      const { error: insertError } = await supabase.from("reportes").insert([
        {
          descripcion: descripcion,
          tipo: tipo,
          gravedad: gravedad,
          latitud: ubicacion.latitude,
          longitud: ubicacion.longitude,
          imagen_url: urlData.publicUrl,
        },
      ]);

      if (insertError) {
        throw new Error("Error al guardar reporte: " + insertError.message);
      }

      Alert.alert("¡Éxito! ✅", "Tu reporte completo ha sido enviado.");

      // Limpiar formulario
      setDescripcion("");
      setImagenUri(null);
      setTipo("Tubería en calzada");
      setGravedad("Goteo");
    } catch (err: any) {
      Alert.alert("Error de conexión ❌", err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Reportar Fuga</Text>

      {/* GPS Status */}
      <Text style={styles.label}>
        Ubicación: {ubicacion ? "✅ Coordenadas obtenidas" : "Buscando GPS..."}
      </Text>

      {/* Tipo de Fuga */}
      <Text style={styles.label}>Tipo de fuga</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={tipo}
          onValueChange={(itemValue) => setTipo(itemValue)}
        >
          {/* Asegúrate de que los 'value' coincidan exactamente con tu ENUM en Supabase */}
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
          onValueChange={(itemValue) => setGravedad(itemValue)}
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
        placeholder="Ej: Fuga constante frente al número 102..."
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
      />

      {/* Botones para Fotos */}
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

      {/* Previsualización de Imagen */}
      {imagenUri && (
        <Image source={{ uri: imagenUri }} style={styles.imagenPreview} />
      )}

      {/* Enviar */}
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
    marginBottom: 20,
    textAlign: "center",
    color: "#1565c0",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 5,
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
