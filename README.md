# 🥭 Mango Launcher

![Version](https://img.shields.io/badge/version-1.1.2-blue.svg)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Electron](https://img.shields.io/badge/Electron-191970?style=flat&logo=Electron&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)

**Mango Launcher** es un lanzador de Minecraft personalizado, construido desde cero con tecnologías web modernas. Nace con una filosofía clara: **ser una base extremadamente confiable y ligera**. Si le das al botón de jugar, el juego tiene que abrir sin problemas. 

Actualmente es un launcher robusto, diseñado para escalar con el tiempo y convertirse en la herramienta definitiva para comunidades y grupos de jugadores, facilitando la instalación de mods, la gestión de memoria y la telemetría en tiempo real.

---

## ✨ Características Principales

* **📦 Gestión de Instancias Aisladas:** Crea múltiples instalaciones de Minecraft (soporte garantizado para las versiones más recientes, como la 1.21.11 y anteriores). Cada instancia tiene su propia carpeta, aislando mundos y configuraciones.
* **⚡ Descargas Ultrarrápidas:** Reestructuración extrema del gestor de red interno para descargar los assets y versiones base de Minecraft a máxima velocidad sin cuellos de botella.
* **🧩 Gestor de Mods Inteligente (Modrinth):** Integración total con la API de Modrinth para buscar e instalar miles de mods directamente desde una UI moderna. Incluye un motor de dependencias que detecta y descarga automáticamente los mods requeridos.
* **📸 Screenshots Manager:** Galería integrada con un protocolo nativo para visualizar, gestionar y abrir tus capturas de Minecraft directamente desde el launcher.
* **⚙️ Optimización Dinámica:** Selectores deslizantes (sliders) para una asignación de memoria RAM precisa y un sistema de "Log Cleaner" individual para liberar espacio por instancia.
* **⏱️ Playtime Tracker:** Registro y acumulación precisa del tiempo de juego por sesión de forma individual en cada instancia.
* **🔧 Soporte Nativo para Modloaders:** Descarga e inyección automática de **Fabric** con solo un clic al crear la instancia.
* **🔐 Gestor Multi-Cuenta:** Soporte oficial para cuentas de **Microsoft** (Premium) y modo **Offline**, permitiendo cambiar de usuario sin necesidad de cerrar la aplicación.
* **🖥️ Mango Terminal:** Una consola técnica integrada que captura la salida estándar del juego en tiempo real. Ideal para debuggear fallos de mods o problemas de memoria.
* **🎮 Discord Rich Presence (RPC):** Integración nativa con estados dinámicos. Muestra si estás jugando, la versión exacta, el modloader, o incluso si estás gestionando instancias o viendo capturas.
* **🔄 Actualizaciones "Mango Toast":** Sistema OTA integrado y notificaciones animadas elegantes que te avisan de descargas de mods y nuevas actualizaciones de la app.

---

## 🗺️ Roadmap (El Futuro del Mango)

El desarrollo es continuo. Estas son algunas de las funciones completadas y los próximos grandes pasos:

- [x] Consola de logs en tiempo real.
- [x] Integración dinámica con Discord RPC.
- [x] Soporte base para Fabric.
- [x] Gestor de Memoria Inteligente con sliders.
- [x] Seguimiento de estadísticas (tiempo jugado).
- [x] Descarga de mods nativa (Modrinth API).
- [ ] **Sistema Social y de Amigos (Backend Centralizado):** Creación de un servidor dedicado (24/7 mediante WebSockets) para agregar amigos y ver en tiempo real si están conectados, en qué versión juegan y si están en un servidor o singleplayer.
- [ ] **Instancias Compartidas (Modpacks en la Nube):** Sistema para descargar automáticamente una lista exacta de mods sincronizada desde un repositorio, para que todos en el servidor tengan exactamente la misma configuración sin tocar archivos `.jar`.
- [ ] Soporte para Forge / NeoForge.

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

    git clone https://github.com/yisusmango/MangoLauncher.git
    cd MangoLauncher

2. Instala las dependencias:

    npm install

### Desarrollo

Para iniciar la aplicación en modo de desarrollo (con Hot-Reload para React):

    npm run dev

### Compilación (Build)

Para empaquetar el launcher en un archivo ejecutable listo para distribuir:

    # Para compilar el .exe en Windows
    npm run build:win

    # Para compilar en macOS (.dmg)
    npm run build:mac

    # Para compilar en Linux (.AppImage / .deb)
    npm run build:linux

Los archivos compilados aparecerán dentro de la carpeta `dist/`.

---

## 🤝 Contribuciones
¡Las contribuciones son bienvenidas! Si tienes una idea para mejorar la confiabilidad del launcher o quieres añadir soporte para una nueva herramienta técnica, siéntete libre de abrir un *Issue* o enviar un *Pull Request*.

## 📜 Licencia
Este proyecto está bajo la Licencia MIT - mira el archivo [LICENSE](LICENSE) para más detalles.

---
*Hecho con 🥭 y mucho código.*