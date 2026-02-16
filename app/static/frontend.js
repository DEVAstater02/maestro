let mediaRecorder;
let audioChunks = [];
let audioContext;
let responseAudioChunks = []; // Buffer for incoming audio chunks
let isReceivingAudio = false;

// 1. Setup WebSocket (Ensure port matches your FastAPI uvicorn port)
const socket = new WebSocket('ws://localhost:8000/ws/voice');
socket.binaryType = 'arraybuffer';

// 2. Get UI Elements
const statusLabel = document.getElementById('status');
const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');


// HANDLE INCOMING MESSAGES (Audio & Visuals)
socket.onmessage = async (event) => {

    // CASE 1: Text Message (JSON -> Visualisation)
    if (typeof event.data === 'string') {
        try {
            console.log("Received text message");
            const msg = JSON.parse(event.data);
            if (msg.type === "visualisation") {
                console.log("Rendering visualisation:", msg.data);
                renderMermaidDiagram(msg.data);
            }
        } catch (e) {
            console.error("Error handling text message:", e);
        }
        return;
    }

    // CASE 2: Binary Message (Audio Chunk)
    console.log("Received audio chunk, size:", event.data.byteLength);

    // Initialize or Resume AudioContext (Browsers block audio until a click happens)
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') await audioContext.resume();

    try {
        // Accumulate audio chunks
        if (!isReceivingAudio) {
            console.log("Starting new audio reception");
            isReceivingAudio = true;
            responseAudioChunks = [];
            statusLabel.innerText = "Receiving audio...";
        }

        responseAudioChunks.push(event.data);
        console.log("Total chunks accumulated:", responseAudioChunks.length);

        // Adaptive timeout: longer wait for more chunks
        // This ensures all chunks arrive before playing
        const timeoutDuration = Math.max(500, responseAudioChunks.length * 1.5);
        console.log("Setting timeout for:", timeoutDuration, "ms");

        clearTimeout(socket.playbackTimeout);
        socket.playbackTimeout = setTimeout(async () => {
            console.log("Timeout triggered. isReceivingAudio:", isReceivingAudio, "chunks:", responseAudioChunks.length);

            // Only play if we haven't already played this response
            if (responseAudioChunks.length > 0 && isReceivingAudio) {
                console.log("Playing audio with", responseAudioChunks.length, "chunks");

                // IMMEDIATELY mark as no longer receiving to prevent ANY duplicate playback
                isReceivingAudio = false;

                // Store chunks locally and clear the global array
                const chunksToPlay = responseAudioChunks.slice();
                responseAudioChunks = [];

                try {
                    // Combine all chunks into one blob
                    const completeAudioBlob = new Blob(chunksToPlay);
                    const arrayBuffer = await completeAudioBlob.arrayBuffer();
                    console.log("Combined audio size:", arrayBuffer.byteLength);

                    // Decode and play the complete audio
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    const source = audioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(audioContext.destination);

                    source.start(0);
                    console.log("Audio playback started, duration:", audioBuffer.duration);
                    statusLabel.innerText = "AI is speaking...";

                    // Reset when playback ends
                    source.onended = () => {
                        console.log("Audio playback ended");
                        statusLabel.innerText = "Ready to record";
                    };
                } catch (decodeError) {
                    console.error("Error decoding audio:", decodeError);
                    statusLabel.innerText = "Error playing audio";
                }
            } else {
                console.log("Skipping playback - already played or no chunks");
            }
        }, timeoutDuration);

    } catch (e) {
        console.error("Error handling audio chunk:", e);
        isReceivingAudio = false;
    }
};

// --- CORE RECORDING LOGIC ---

// 3. ATTACH CLICK EVENT TO START BUTTON
recordBtn.onclick = async () => {
    try {
        console.log("Requesting microphone...");
        statusLabel.innerText = "Requesting microphone...";

        // Browsers require a user gesture to start AudioContext
        if (!audioContext) audioContext = new AudioContext();
        if (audioContext.state === 'suspended') await audioContext.resume();

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            statusLabel.innerText = "Sending audio to server...";
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const buffer = await audioBlob.arrayBuffer();

            if (socket.readyState === WebSocket.OPEN) {
                socket.send(buffer);
                statusLabel.innerText = "Processing AI response...";
            } else {
                statusLabel.innerText = "Error: WebSocket is not connected!";
            }
        };

        mediaRecorder.start();

        // UI Updates
        recordBtn.disabled = true;
        stopBtn.disabled = false;
        statusLabel.innerText = "Recording... Speak now!";
        console.log("Recording started successfully");

    } catch (err) {
        console.error("Microphone Error:", err);
        statusLabel.innerText = "Error: Could not access microphone. Check permissions.";
    }
};

// 4. ATTACH CLICK EVENT TO STOP BUTTON
stopBtn.onclick = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        recordBtn.disabled = false;
        stopBtn.disabled = true;
        // Stop the mic tracks to turn off the "recording" red dot in browser
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
};

socket.onopen = () => console.log("Connected to Backend WebSocket");
socket.onerror = (err) => console.error("WebSocket Error:", err);

// --- MERMAID INTEGRATION ---
// Helper function to render mermaid diagrams
// You can call this function with valid mermaid syntax
// Example: renderMermaidDiagram('graph TD; A-->B;')
window.renderMermaidDiagram = async (mermaidCode) => {
    const outputDiv = document.getElementById('mermaid-output');

    try {
        // Clear previous content
        outputDiv.innerHTML = '<div class="mermaid">' + mermaidCode + '</div>';

        // Re-run mermaid to render the new chart
        await mermaid.run({
            nodes: outputDiv.querySelectorAll('.mermaid')
        });

        // Initialize SVG Pan Zoom
        const svgElement = outputDiv.querySelector('svg');
        if (svgElement) {
            // CRITICAL: Clear Mermaid's default styles
            svgElement.removeAttribute('style');

            // 1. Ensure the PARENT of the SVG (the .mermaid div) fills the container
            // This prevents the "cut off" issue if the div defaults to auto height > container height
            if (svgElement.parentElement) {
                svgElement.parentElement.style.width = '100%';
                svgElement.parentElement.style.height = '100%';
                svgElement.parentElement.style.overflow = 'hidden';
                svgElement.parentElement.style.display = 'flex'; // Helps with centering
                svgElement.parentElement.style.justifyContent = 'center';
                svgElement.parentElement.style.alignItems = 'center';
            }

            // 2. Force SVG to fill that parent
            svgElement.setAttribute('width', '100%');
            svgElement.setAttribute('height', '100%');
            svgElement.style.width = '100%';
            svgElement.style.height = '100%';

            // 3. Initialize pan-zoom 
            svgPanZoom(svgElement, {
                zoomEnabled: true,
                controlIconsEnabled: false,
                fit: true,
                center: true,
                minZoom: 0.1,
                maxZoom: 10
            });
        }

    } catch (err) {
        console.error("Mermaid rendering error:", err);
        outputDiv.innerHTML = `<p style="color:red">Error rendering chart: ${err.message}</p>`;
    }
};