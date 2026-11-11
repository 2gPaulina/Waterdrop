import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as Location from "expo-location";
import { randomUUID } from "expo-crypto";
import { Boton } from "@/components/Boton";
import { Chips } from "@/components/Chips";
import { actualizarReporte, crearReporte, obtenerReporte } from "@/db/database";
import { elegirFoto, guardarFotoPermanente } from "@/services/foto";
import { ESTADOS, GRAVEDADES, TIPOS, type EstadoProceso, type Gravedad, type Reporte, type Tipo } from "@/types/reporte";

export default function Formulario() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const db = useSQLiteContext();
  const router = useRouter();

  const [original, setOriginal] = useState<Reporte | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState<Tipo>("tuberia");
  const [gravedad, setGravedad] = useState<Gravedad>("goteo");
  const [estado, setEstado] = useState<EstadoProceso>("recibido");  const [referencia, setReferencia] = useState("");
  const [correo, setCorreo] = useState("");
  const [confirmada, setConfirmada] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [buscandoGps, setBuscandoGps] = useState(false);

  useEffect(() => {
    if (!id) return;
    obtenerReporte(db, id).then((r) => {
      if (!r) return;
      setOriginal(r);
      setDescripcion(r.descripcion); setTipo(r.tipo); setGravedad(r.gravedad); setEstado(r.estado);
      setReferencia(r.referencia); setFotoUri(r.fotoUri);
      setCorreo(r.correoCiudadano ?? "");
      setConfirmada(r.ubicacionConfirmada === 1);
      if (r.latitud != null && r.longitud != null) setCoords({ lat: r.latitud, lng: r.longitud });
    });
  }, [id, db]);

  const foto = async (origen: "camara" | "galeria") => {
    try {
      const uri = await elegirFoto(origen);
      if (uri) setFotoUri(uri);
    } catch {
      Alert.alert("Permiso denegado", origen === "camara"
        ? "Sin permiso de cámara no puedes tomar la foto. Puedes elegir una de la galería o activar el permiso en Ajustes."
        : "No se pudo abrir la galería.");
    }
  };

  const obtenerUbicacion = async () => {
    setBuscandoGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso denegado", "No se pudo obtener tu ubicación. Escribe una referencia del lugar (calle, colonia, entre qué calles) y podrás continuar.");
        return;
      }
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
      setConfirmada(false);
    } catch {
      Alert.alert("Ubicación no disponible", "Escribe una referencia del lugar para continuar.");
    } finally {
      setBuscandoGps(false);
    }
  };

  const validar = () => {
    const e: Record<string, string> = {};
    if (descripcion.trim().length < 10) e.descripcion = "Describe la fuga con al menos 10 caracteres.";
    if (referencia.trim().length < 3) e.referencia = "Escribe una referencia del lugar (calle, colonia).";
    if (!fotoUri && !original?.fotoPath) e.foto = "La fotografía es obligatoria.";
    const c = correo.trim();
    if (c && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) e.correo = "Escribe un correo válido.";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    const ahora = new Date().toISOString();
    const rid = original?.id ?? randomUUID();
    let uriFinal = fotoUri;
    const cambioFoto = fotoUri !== (original?.fotoUri ?? null);
    if (fotoUri && cambioFoto) uriFinal = guardarFotoPermanente(fotoUri, rid);

    const r: Reporte = {
      id: rid,
      descripcion: descripcion.trim(),
      tipo, gravedad, estado,
      referencia: referencia.trim(),
      latitud: coords?.lat ?? null,
      longitud: coords?.lng ?? null,
      ubicacionConfirmada: coords && confirmada ? 1 : 0,
      correoCiudadano: correo.trim() || null,
      motivoDescarte: original?.motivoDescarte ?? null,
      reporteOriginalId: original?.reporteOriginalId ?? null,
      fechaValidacion: original?.fechaValidacion ?? null,
      fechaInicioReparacion: original?.fechaInicioReparacion ?? null,
      fechaResolucion: original?.fechaResolucion ?? null,
      observacionesPersonal: original?.observacionesPersonal ?? null,
      fotoUri: uriFinal,
      fotoPath: cambioFoto ? null : original?.fotoPath ?? null, // si cambió la foto, se vuelve a subir
      creadoEn: original?.creadoEn ?? ahora,
      actualizadoEn: ahora,
      syncEstado: "pendiente_envio",
      syncError: null,
    };
    try {
      if (original) await actualizarReporte(db, r); else await crearReporte(db, r);
      Alert.alert("Listo", original ? "Reporte actualizado." : "Reporte guardado. Se enviará al sincronizar.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("No se pudo guardar", e?.message ?? "Error desconocido");
    }
  };

  return (
    <ScrollView contentContainerStyle={s.cont} keyboardShouldPersistTaps="handled">
      <Text style={s.label}>Fotografía *</Text>
      {fotoUri ? <Image source={{ uri: fotoUri }} style={s.preview} /> :
        original?.fotoPath ? <Text style={s.ok}>La foto ya está guardada en la nube.</Text> : null}
      <View style={s.fila}>
        <View style={{ flex: 1 }}><Boton titulo="Tomar foto" onPress={() => foto("camara")} /></View>
        <View style={{ flex: 1 }}><Boton titulo="Galería" secundario onPress={() => foto("galeria")} /></View>
      </View>
      {errores.foto && <Text style={s.error}>{errores.foto}</Text>}

      <Text style={s.label}>Tipo de fuga</Text>
      <Chips opciones={TIPOS} valor={tipo} onChange={setTipo} />

      <Text style={s.label}>Gravedad</Text>
      <Chips opciones={GRAVEDADES} valor={gravedad} onChange={setGravedad} />

      <Text style={s.label}>Descripción *</Text>
      <TextInput style={[s.input, { height: 90 }]} multiline value={descripcion} onChangeText={setDescripcion}
        placeholder="Ej. Sale agua de la tubería desde hace 2 días" textAlignVertical="top" />
      {errores.descripcion && <Text style={s.error}>{errores.descripcion}</Text>}

      <Text style={s.label}>Ubicación</Text>
      <Boton titulo={coords ? "Actualizar ubicación GPS" : "Usar mi ubicación GPS"} secundario cargando={buscandoGps} onPress={obtenerUbicacion} />
      {coords && <Text style={s.ok}>📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</Text>}
      <TextInput style={s.input} value={referencia} onChangeText={setReferencia}
        placeholder="Referencia: calle, colonia, entre qué calles *" />
      {errores.referencia && <Text style={s.error}>{errores.referencia}</Text>}

      {original && (
        <>
          <Text style={s.label}>Estado del reporte</Text>
          <Chips opciones={ESTADOS} valor={estado} onChange={setEstado} />
        </>
      )}

      <View style={{ height: 8 }} />
      <Boton titulo={original ? "Guardar cambios" : "Guardar reporte"} onPress={guardar} />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  cont: { padding: 16, gap: 10, backgroundColor: "#f0f9ff" },
  label: { fontWeight: "700", marginTop: 6 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, padding: 10 },
  preview: { width: "100%", height: 220, borderRadius: 12 },
  fila: { flexDirection: "row", gap: 8 },
  error: { color: "#dc2626" },
  ok: { color: "#16a34a" },
});
