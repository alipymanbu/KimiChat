# Kimi CLI

[![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)](https://nodejs.org/)

Una interfaz de línea de comandos (CLI) interactiva para interactuar con la IA de Kimi (kimi.ai). Soporta respuestas en streaming, modo "Deep Think" y capacidades de búsqueda web, manteniendo el historial de la conversación directamente desde los servidores de Kimi.

## ✨ Características

- **🔌 CLI Interactivo** — Chat continuo desde la comodidad de tu terminal.
- **🌊 Streaming Nativo** — Los tokens aparecen en pantalla en tiempo real a medida que la IA responde.
- **🧠 Deep Think Real** — Procesa e imprime el razonamiento de la IA paso a paso, diferenciándolo de la respuesta final.
- **🔍 Búsqueda Web** — Opción para permitirle a Kimi buscar información actualizada en internet.
- **📚 Historial Dinámico** — No guarda archivos locales con el historial; la memoria de la conversación la maneja directamente el servidor de Kimi mediante IDs dinámicos.

## 📦 Requisitos

- **Node.js**: Versión 16.0 o superior recomendada.
- **Cuenta de Kimi.ai**: Se requiere un token de acceso válido.

## 🚀 Instalación

1. Clona o descarga el repositorio.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Configura tu token de acceso (ver sección de Configuración).

## 🔐 Configuración

### Obtener el Token de Acceso

1. Entra a [kimi.ai](https://kimi.ai) e inicia sesión.
2. Abre la **Consola de Desarrollador** (`F12` y ve a la pestaña **Console**).
3. Pega este código y presiona Enter:
   ```javascript
   localStorage.getItem('access_token')
   ```
4. Copia el token que te devuelve (empieza con `eyJ...`, asegúrate de copiarlo sin las comillas).

### Archivo `.env`

Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:

```bash
KIMI_TOKEN=tu-token-aqui
```

## 💻 Uso

El CLI cuenta con dos comandos principales:

### Modo Chat Interactivo (Recomendado)

Inicia una sesión interactiva donde el contexto se mantiene de un mensaje al otro:

```bash
node src/cli.js chat
```

**Opciones:**
- `-s, --search`: Habilita la búsqueda web.
- `-d, --deepThink`: Habilita el modo de razonamiento profundo.
- `-m, --model <modelo>`: Cambia el modelo (por defecto: `SCENARIO_K2D5`).

Ejemplo con todo activado:
```bash
node src/cli.js chat --search --deepThink
```

### Modo Pregunta Única (Ask)

Hace una sola pregunta, muestra la respuesta y sale. Ideal para scripts rápidos o atajos:

```bash
node src/cli.js ask "Explicame la teoría de la relatividad en un párrafo"
```

Opciones: *(Mismas que en el modo chat)*

```bash
node src/cli.js ask "¿Qué clima hace hoy en Buenos Aires?" --search
```

## 🛠️ Detalles Técnicos

### Manejo de Estado (Historial)

A diferencia de muchos bots que guardan todo el historial en un JSON gigante, este CLI utiliza la infraestructura nativa de Kimi. Al iniciar un nuevo chat (`startNewChat`), obtenemos un `chatId`. 

Con cada respuesta, el servidor devuelve un `lastMessageId`. El CLI almacena en memoria este ID y se lo envía a Kimi como `parent_id` en el siguiente turno. De esta forma, Kimi reconstruye todo el contexto internamente sin que tu máquina tenga que subir megabytes de texto.

---

**Nota**: Este es un proyecto comunitario no oficial y no está afiliado a Moonshot AI o kimi.ai.
