# Pruebas WaterDrop

| Prueba | Pasos | Resultado esperado |
|---|---|---|
| Flujo normal | Nuevo reporte con foto, descripción y referencia → Guardar | Aparece en "Mis reportes" con "Por enviar" |
| Campos vacíos | Guardar sin foto/descripción/referencia | Mensajes de error en rojo, no guarda |
| Permiso de cámara denegado | Negar cámara | Alerta; se puede usar galería |
| Permiso GPS denegado | Negar ubicación | Alerta; se puede continuar con la referencia escrita |
| Cerrar y reabrir | Cerrar la app por completo y abrirla | Reportes y fotos siguen ahí |
| Sin internet | Modo avión → Sincronizar | Aviso de sin conexión; reportes siguen guardados |
| Reintento | Con internet → Sincronizar de nuevo | Pasan a "Enviado"; en Supabase no hay duplicados |
| Otro dispositivo | Iniciar sesión con la misma cuenta → Sincronizar | Se descargan los reportes y se ve la foto |
| Estados separados | Editar y poner "Resuelto" | "Resuelto" (proceso) ≠ "Enviado" (sincronización) |
