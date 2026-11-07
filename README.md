🚰 WaterDrop — Módulo de Reporte de Fugas
Aplicación móvil construida con Expo y Supabase para el reporte, captura fotográfica y geolocalización exacta de fugas de agua.

🚀 Instalación rápida: Ejecuta el siguiente comando para instalar todas las librerías necesarias de un solo golpe:

npx expo install @supabase/supabase-async-storage @react-native-async-storage/async-storage @react-native-picker/picker expo-location expo-image-picker expo-blob react-native-maps


📦 Desglose de Dependencias y Uso
Si prefieres instalar cada módulo por separado o documentar el proyecto paso a paso:

⚡ 1. Base de Datos y Sesiones (Supabase)
Permite autenticar usuarios, sincronizar tablas y almacenar datos de forma persistente en el dispositivo.

npx expo install @supabase/supabase-async-storage @react-native-async-storage/async-storage


🎨 2. Componentes UI (Menú Desplegable)
Despliega los selectores nativos para definir el Tipo de fuga (Medidor, Tubería en calzada, etc.) y la Gravedad.

npx expo install @react-native-picker/picker


📍 3. Geolocalización por GPS
Gestiona los permisos del sistema y obtiene las coordenadas exactas de latitud y longitud en tiempo real.

npx expo install expo-location


📸 4. Cámara y Galería de Fotografías
Permite capturar imágenes de evidencia usando la cámara física del teléfono o seleccionarlas directamente desde la galería.

npx expo install expo-image-picker


⚡ 5. Procesamiento de Archivos (Blobs)
Transforma y optimiza las imágenes locales a formato Blob para enviarlas al bucket de Storage en Supabase de forma rápida.

npx expo install expo-blob


🗺️ 6. Mapa Interactivo Manual
Renderiza un mapa nativo donde el usuario puede verificar la ubicación obtenida por GPS o ajustar el punto exacto arrastrando el marcador.

npx expo install react-native-maps
