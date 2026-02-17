# 🎓 Maestro — Real-time Voice AI Tutor

Maestro is a real-time, voice-based AI tutoring application for Computer Science. You speak to it, it thinks with Claude, and replies with a natural voice — all streamed in real-time over WebSockets. It also auto-generates interactive Mermaid.js diagrams to visually explain concepts.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Voice-In, Voice-Out** | Record your question via the browser, get a spoken AI response streamed back in real-time. |
| **Streaming LLM + TTS** | Claude generates text in a stream → ElevenLabs converts it to speech → audio chunks are sent to the browser as they're ready. |
| **Socratic Tutoring** | The AI tutor uses scaffolding and the Socratic method — it asks questions, gives hints, and guides you to the answer instead of just lecturing. |
| **Auto Visualisations** | After every response, a second LLM call decides if a diagram would help and generates the appropriate Mermaid.js chart (flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams, mind maps, etc.). |
| **Interactive Diagrams** | Rendered Mermaid diagrams support pan and zoom via `svg-pan-zoom`. |
| **Conversation Memory** | Full chat history is maintained and passed to the LLM for contextual, multi-turn conversations. |

---

## 🏗️ Architecture

```
Browser (index.html + frontend.js)
    │
    │  WebSocket (binary audio ↔ binary audio + JSON visuals)
    ▼
FastAPI Server (main.py)
    ├── ElevenLabs STT  ← transcribes user audio
    ├── Claude LLM      ← generates tutor response (streaming)
    ├── ElevenLabs TTS   ← converts response to speech (streaming)
    └── Claude LLM       ← generates Mermaid visualisation
```

### Conversation Flow

1. **User records** audio in the browser via `MediaRecorder`.
2. Audio bytes are sent over WebSocket to the FastAPI server.
3. **Speech-to-Text** — ElevenLabs `scribe_v2` transcribes the audio.
4. **LLM Response** — Claude (`claude-haiku-4-5`) streams a Socratic tutor response.
5. **Text-to-Speech** — ElevenLabs streams audio chunks back to the client.
6. **Visualisation** — A second Claude call generates a Mermaid diagram (if helpful).
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
│   │   ├── elevenlabs.py          # ElevenLabs TTS, STT, and streaming TTS
│   │   └── assemblyai_repo.py     # AssemblyAI STT (alternative transcriber)
│   ├── routers/                   # (Placeholder for future route modules)
│   ├── services/
│   │   └── recorder.py            # Local microphone recording utility (sounddevice)
│   └── static/
│       ├── index.html             # Browser UI — record button, diagram viewer
│       └── frontend.js            # WebSocket client, audio playback, Mermaid rendering
├── requirements.txt               # Python dependencies
├── STREAMING_IMPLEMENTATION.md    # Technical doc on the streaming TTS architecture
├── .env                           # API keys (not committed)
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **PortAudio** (required by `pyaudio`) — install via:
  ```bash
  # macOS
  brew install portaudio

  # Ubuntu/Debian
  sudo apt-get install portaudio19-dev
  ```

### 1. Clone & Install

```bash
git clone <repo-url> maestro
cd maestro
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
CLAUDE_CODE=your_anthropic_api_key
ELEVEN_LABS=your_elevenlabs_api_key
ASSEMBLY_AI=your_assemblyai_api_key
```

| Variable | Service | Purpose |
|---|---|---|
| `CLAUDE_CODE` | [Anthropic](https://console.anthropic.com/) | Claude LLM for tutoring + visualisation |
| `ELEVEN_LABS` | [ElevenLabs](https://elevenlabs.io/) | Text-to-Speech and Speech-to-Text |
| `ASSEMBLY_AI` | [AssemblyAI](https://www.assemblyai.com/) | Alternative Speech-to-Text (initialised but ElevenLabs STT is used by default) |

### 3. Run the App

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Then open **http://localhost:8000** in your browser.

### 4. Use It

1. Click **"Start Recording"** and ask a Computer Science question.
2. Click **"Stop & Send"** to send your audio.
3. Wait for the AI to respond — you'll hear the spoken answer streamed back.
4. A diagram will appear in the visualiser panel if the concept benefits from one.

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Backend Framework | [FastAPI](https://fastapi.tiangolo.com/) + WebSockets |
| LLM | [Anthropic Claude](https://www.anthropic.com/) (Haiku 4.5) |
| Text-to-Speech | [ElevenLabs](https://elevenlabs.io/) (Flash v2.5, streaming) |
| Speech-to-Text | [ElevenLabs Scribe v2](https://elevenlabs.io/) |
| Frontend | Vanilla HTML/JS, [Mermaid.js](https://mermaid.js.org/), [svg-pan-zoom](https://github.com/bumbu/svg-pan-zoom) |
| Audio Recording | Browser `MediaRecorder` API |

---

## 📄 License

This project is unlicensed. Add a license as needed.
