# 🥭 Mango Launcher

![Version](https://img.shields.io/badge/version-1.0.7-blue.svg)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Electron](https://img.shields.io/badge/Electron-191970?style=flat&logo=Electron&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)

**Mango Launcher** es un lanzador de Minecraft personalizado, construido desde cero con tecnologías web modernas. Nace con una filosofía clara: **ser una base extremadamente confiable y ligera**. Si le das al botón de jugar, el juego tiene que abrir sin problemas. 

Actualmente es un launcher básico pero robusto, diseñado para escalar con el tiempo y convertirse en la herramienta definitiva para comunidades y grupos de jugadores, facilitando la instalación de mods, la gestión de memoria y la telemetría en tiempo real.

---

## ✨ Características Principales

* **📦 Gestión de Instancias Aisladas:** Crea múltiples instalaciones de Minecraft (soporte garantizado para las versiones más recientes, como la 1.21.11 y anteriores). Cada instancia tiene su propia carpeta, aislando mundos y configuraciones.
* **🔧 Soporte Nativo para Modloaders:** Descarga e inyección automática de **Fabric** con solo un clic al crear la instancia.
* **🔐 Autenticación Multi-Cuenta:** * Soporte oficial para cuentas de **Microsoft** (Premium) usando la API segura de Xbox/Mojang.
  * Modo **Offline** para pruebas y desarrollo local.
* **🖥️ Mango Terminal (Logs en Vivo):** Una consola técnica integrada que captura la salida estándar del juego. Ideal para debuggear fallos de mods o problemas de memoria en tiempo real.
* **🎮 Discord Rich Presence (RPC):** Integración nativa con Discord. Muestra a tus amigos exactamente qué versión, modloader e instancia estás jugando en ese momento, o si estás navegando por los menús del launcher.
* **🔄 Actualizaciones Automáticas Silenciosas:** Sistema OTA (Over-The-Air) integrado con notificaciones personalizadas "Mango Toast" que te avisan cuando hay una nueva versión lista para instalar.
* **🎨 Interfaz Moderna y Fluida:** Diseñado con React y TailwindCSS. Tema oscuro elegante, animaciones suaves y experiencia de usuario minimalista.

---

## 🗺️ Roadmap (El Futuro del Mango)

El desarrollo es continuo. Estas son algunas de las funciones planificadas para las próximas versiones:

- [x] Consola de logs en tiempo real.
- [x] Integración dinámica con Discord RPC.
- [x] Soporte base para Fabric.
- [ ] **Gestor de Memoria Inteligente:** Slider visual para asignar RAM basándose en la memoria total del sistema para evitar cuelgues.
- [ ] **Instancias Compartidas (Modpacks en la Nube):** Sistema para descargar automáticamente una lista exacta de mods sincronizada desde un repositorio, para que todos en el servidor tengan exactamente la misma configuración sin tocar archivos `.jar`.
- [ ] Soporte para Forge / NeoForge.
- [ ] Seguimiento de estadísticas (tiempo jugado por instancia).

---

## 🛠️ Stack Tecnológico

Este proyecto está construido aprovechando el poder del ecosistema web en el escritorio:
* **Core:** [Electron](https://www.electronjs.org/)
* **Frontend:** [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
* **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
* **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
* **Librerías Clave:** `minecraft-launcher-core`, `msmc` (Microsoft Auth), `discord-rpc`, `electron-updater`.

---

## 💻 Entorno de Desarrollo (Setup)

Si quieres clonar el proyecto, modificar el código o compilar tu propia versión, sigue estos pasos.

### Requisitos previos
* [Node.js](https://nodejs.org/) (v18 o superior recomendado)
* Git

### Instalación

1. Clona este repositorio:
   ```bash
   git clone [https://github.com/yisusmango/MangoLauncher.git](https://github.com/yisusmango/MangoLauncher.git)
   cd MangoLauncher
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

### Desarrollo

Para iniciar la aplicación en modo de desarrollo (con Hot-Reload para React):
   ```bash
   npm run dev
   ```

### Compilación (Build)

Para empaquetar el launcher en un archivo ejecutable listo para distribuir:

   ```bash
   # Para compilar el .exe en Windows
   npm run build:win

   # Para compilar en macOS (.dmg)
   npm run build:mac

   # Para compilar en Linux (.AppImage / .deb)
   npm run build:linux
   ```
Los archivos compilados aparecerán dentro de la carpeta `dist/`.

---

## 🤝 Contribuciones
¡Las contribuciones son bienvenidas! Si tienes una idea para mejorar la confiabilidad del launcher o quieres añadir soporte para una nueva herramienta técnica, siéntete libre de abrir un *Issue* o enviar un *Pull Request*.

## 📜 Licencia
Este proyecto está bajo la Licencia MIT - mira el archivo [LICENSE](LICENSE) para más detalles.

---
*Hecho con 🥭 y mucho código.*