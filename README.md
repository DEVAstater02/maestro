# 🎓 Maestro — Real-time Voice AI Tutor

Maestro is a real-time, voice-based AI tutoring application for Computer Science. You speak to it, it thinks with an LLM (Claude or Gemini), and replies with a natural voice — all streamed in real-time over WebSockets. It also auto-generates interactive Mermaid.js diagrams to visually explain concepts.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Voice-In, Voice-Out** | Record your question via the browser, get a spoken AI response streamed back in real-time. |
| **Streaming LLM + TTS** | The LLM generates text in a stream → ElevenLabs converts it to speech → audio chunks are sent to the browser as they're ready. |
| **Socratic Tutoring** | The AI tutor uses scaffolding and the Socratic method — it asks questions, gives hints, and guides you to the answer instead of just lecturing. |
| **Auto Visualisations** | After every response, a second LLM call decides if a diagram would help and generates the appropriate Mermaid.js chart (flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams, mind maps, etc.). |
| **Interactive Diagrams** | Rendered Mermaid diagrams support pan and zoom via `svg-pan-zoom`. |
| **Conversation Memory** | Full chat history is maintained and passed to the LLM for contextual, multi-turn conversations. |

---

## 🏗️ Architecture

```
Next.js Frontend (localhost:3000)
    │
    │  WebSocket (binary audio ↔ binary audio + JSON visuals)
    ▼
FastAPI Backend (localhost:8000)
    ├── ElevenLabs STT  ← transcribes user audio
    ├── LLM (Claude/Gemini) ← generates tutor response (streaming)
    ├── ElevenLabs TTS   ← converts response to speech (streaming)
    └── LLM (Claude/Gemini) ← generates Mermaid visualisation
```

### Conversation Flow

1. **User records** audio in the browser via `MediaRecorder`.
2. Audio bytes are sent over WebSocket to the FastAPI server.
3. **Speech-to-Text** — ElevenLabs `scribe_v2` transcribes the audio.
4. **LLM Response** — The LLM streams a Socratic tutor response.
5. **Text-to-Speech** — ElevenLabs streams audio chunks back to the client.
6. **Visualisation** — A second LLM call generates a Mermaid diagram (if helpful).
7. The browser plays the audio and renders the diagram with pan-zoom support.

---

## 📁 Project Structure

```
maestro/
├── app/
│   ├── main.py                    # FastAPI app, WebSocket handler, entry point
│   ├── models/
│   │   └── user_models.py         # Pydantic request/response models
│   ├── prompts/
│   │   ├── prompts.py             # Socratic CS tutor system prompt
│   │   └── visualiser.py          # Mermaid diagram generation prompt
│   ├── repositories/
│   │   ├── claude.py              # Anthropic Claude client (sync + streaming)
│   │   ├── gemini.py              # Google Gemini client
│   │   ├── elevenlabs.py          # ElevenLabs TTS, STT, and streaming TTS
│   │   └── assemblyai_repo.py     # AssemblyAI STT (alternative transcriber)
│   ├── routers/                   # (Placeholder for future route modules)
│   └── services/
│       └── recorder.py            # Local microphone recording utility (sounddevice)
├── frontend/                      # Next.js frontend application
│   ├── src/app/                   # Next.js app directory
│   └── package.json
├── requirements.txt               # Python dependencies
├── STREAMING_IMPLEMENTATION.md    # Technical doc on the streaming TTS architecture
├── .env                           # API keys (not committed)
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** and **pnpm**
- **PortAudio** (required by `pyaudio`) — install via:
  ```bash
  # macOS
  brew install portaudio

  # Ubuntu/Debian
  sudo apt-get install portaudio19-dev
  ```

### 1. Clone & Install Backend

```bash
git clone <repo-url> maestro
cd maestro
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Install Frontend

```bash
cd frontend
pnpm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
CLAUDE_CODE=your_anthropic_api_key
ELEVEN_LABS=your_elevenlabs_api_key
ASSEMBLY_AI=your_assemblyai_api_key
LLM_PROVIDER=claude   # or "gemini"
```

| Variable | Service | Purpose |
|---|---|---|
| `CLAUDE_CODE` | [Anthropic](https://console.anthropic.com/) | Claude LLM for tutoring + visualisation |
| `ELEVEN_LABS` | [ElevenLabs](https://elevenlabs.io/) | Text-to-Speech and Speech-to-Text |
| `ASSEMBLY_AI` | [AssemblyAI](https://www.assemblyai.com/) | Alternative Speech-to-Text |
| `LLM_PROVIDER` | — | Switch between `claude` (default) and `gemini` |

### 4. Run the App

Start the **backend** and **frontend** in separate terminals:

```bash
# Terminal 1 — Backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend
cd frontend
pnpm dev
```

Then open **http://localhost:3000** in your browser.

### 5. Use It

1. Click **"Start Recording"** and ask a Computer Science question.
2. Click **"Stop & Send"** to send your audio.
3. Wait for the AI to respond — you'll hear the spoken answer streamed back.
4. A diagram will appear in the visualiser panel if the concept benefits from one.

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Backend Framework | [FastAPI](https://fastapi.tiangolo.com/) + WebSockets |
| LLM | [Anthropic Claude](https://www.anthropic.com/) / [Google Gemini](https://ai.google.dev/) |
| Text-to-Speech | [ElevenLabs](https://elevenlabs.io/) (Flash v2.5, streaming) |
| Speech-to-Text | [ElevenLabs Scribe v2](https://elevenlabs.io/) |
| Frontend | [Next.js](https://nextjs.org/) + TypeScript, [Mermaid.js](https://mermaid.js.org/), [svg-pan-zoom](https://github.com/bumbu/svg-pan-zoom) |
| Audio Recording | Browser `MediaRecorder` API |

---

## 📄 License

This project is unlicensed. Add a license as needed.
