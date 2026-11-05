import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { initDb } from "@/db/database";
import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="waterdrop.db" onInit={initDb}>
      <AuthProvider>
        <Stack screenOptions={{ headerStyle: { backgroundColor: "#0284c7" }, headerTintColor: "#fff" }}>
          <Stack.Screen name="index" options={{ title: "WaterDrop" }} />
          <Stack.Screen name="reportes" options={{ title: "Mis reportes" }} />
          <Stack.Screen name="formulario" options={{ title: "Reporte de fuga" }} />
          <Stack.Screen name="reporte/[id]" options={{ title: "Detalle del reporte" }} />
          <Stack.Screen name="login" options={{ title: "Cuenta", presentation: "modal" }} />
        </Stack>
      </AuthProvider>
    </SQLiteProvider>
  );
}
