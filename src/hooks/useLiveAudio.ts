import { useState, useRef, useEffect, useCallback } from 'react';

// Converts Float32Array (from mic) to base64 PCM string for sending to backend.
function pcmToBase64(pcmData: Float32Array): string {
  const buffer = new ArrayBuffer(pcmData.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < pcmData.length; i++) {
    const s = Math.max(-1, Math.min(1, pcmData[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Converts base64 PCM string (from backend) to Float32Array for playback.
function base64ToPcm(base64: string): Float32Array {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new DataView(buffer);
  for (let i = 0; i < binary.length; i++) {
    view.setUint8(i, binary.charCodeAt(i));
  }
  const int16Array = new Int16Array(buffer);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0;
  }
  return float32Array;
}

export type ChatMessage = { sender: 'user' | 'ai'; text: string; timestamp: Date };

export function useLiveAudio() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOwner, setShowOwner] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [websiteResult, setWebsiteResult] = useState<{url: string, name: string, description: string} | null>(null);
  const [userVolume, setUserVolume] = useState(0);
  const [aiVolume, setAiVolume] = useState(0);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenIntervalRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  const userAnalyserRef = useRef<AnalyserNode | null>(null);
  const aiAnalyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const updateVolumes = useCallback(() => {
    if (userAnalyserRef.current) {
      const array = new Uint8Array(userAnalyserRef.current.frequencyBinCount);
      userAnalyserRef.current.getByteFrequencyData(array);
      const avg = array.reduce((a, b) => a + b, 0) / array.length;
      setUserVolume(avg);
    }
    
    if (aiAnalyserRef.current) {
      const array = new Uint8Array(aiAnalyserRef.current.frequencyBinCount);
      aiAnalyserRef.current.getByteFrequencyData(array);
      const avg = array.reduce((a, b) => a + b, 0) / array.length;
      setAiVolume(avg);
    }

    animationFrameRef.current = requestAnimationFrame(updateVolumes);
  }, []);

  const stopScreenShare = useCallback(() => {
    if (screenIntervalRef.current) {
      window.clearInterval(screenIntervalRef.current);
      screenIntervalRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
  }, []);

  const startScreenShare = useCallback(async () => {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
      setError("Screen sharing is restricted in this preview window. Please click the 'Open in new tab' button at the top right to use this feature.");
      console.warn("getDisplayMedia is not supported in this context.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      setIsScreenSharing(true);

      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Send 1 frame per second
      screenIntervalRef.current = window.setInterval(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        
        // Resize to reduce payload size
        const maxWidth = 800;
        const scale = Math.min(1, maxWidth / video.videoWidth);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64 jpeg
        const base64Url = canvas.toDataURL('image/jpeg', 0.5);
        const base64Data = base64Url.split(',')[1];
        
        wsRef.current.send(JSON.stringify({ video: base64Data }));
      }, 1000);

      // Handle user stopping screen share via browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (err: any) {
      console.error("Screen share failed", err);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setError("Screen sharing is restricted in this environment. Please open the app in a new tab.");
      } else {
        setError("Failed to start screen share: " + err.message);
      }
      setIsScreenSharing(false);
    }
  }, [stopScreenShare]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Fetch custom instruction from Firestore
      let instructionParam = "";
      let isAdminParam = false;
      try {
        const { auth, db } = await import('../lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        
        if (auth.currentUser?.email === 'ridym7876@gmail.com') {
           isAdminParam = true;
        }

        const docSnap = await getDoc(doc(db, 'ai_settings', 'instruction'));
        if (docSnap.exists()) {
          instructionParam = encodeURIComponent(docSnap.data().text);
        }
      } catch (e) {
        console.error("Failed to fetch custom instructions", e);
      }

      // 1. Setup Audio Contexts
      // Input: 16kHz for mic capture (expected by Gemini Live API)
      inputCtxRef.current = new AudioContext({ sampleRate: 16000 });
      // Output: 24kHz for playback (model output from Gemini)
      outputCtxRef.current = new AudioContext({ sampleRate: 24000 });

      // Setup Analysers
      userAnalyserRef.current = inputCtxRef.current.createAnalyser();
      userAnalyserRef.current.fftSize = 256;
      aiAnalyserRef.current = outputCtxRef.current.createAnalyser();
      aiAnalyserRef.current.fftSize = 256;
      updateVolumes();

      // 2. Setup WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live?instruction=${instructionParam}&isAdmin=${isAdminParam}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setIsConnected(true);
        setIsConnecting(false);

        // Setup Web Speech API for User transcription
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = false;
          recognitionRef.current.lang = 'bn-BD';
          recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            if (transcript.trim()) {
              setChatHistory(prev => [...prev, { sender: 'user', text: transcript, timestamp: new Date() }]);
            }
          };
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error("Speech recognition start failed", e);
          }
        }

        // 3. Setup Mic Capture once WS is open
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;
          const inputCtx = inputCtxRef.current;
          if (!inputCtx) return;

          const source = inputCtx.createMediaStreamSource(stream);
          sourceRef.current = source;
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;
          
          source.connect(processor);
          if (userAnalyserRef.current) {
            source.connect(userAnalyserRef.current);
          }
          processor.connect(inputCtx.destination);

          processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
              const base64 = pcmToBase64(e.inputBuffer.getChannelData(0));
              ws.send(JSON.stringify({ audio: base64 }));
            }
          };
        } catch (err) {
          console.error('Failed to get user media', err);
          setError('Microphone access denied or failed.');
          disconnect();
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const outputCtx = outputCtxRef.current;
          
          if (msg.error) {
             setError(msg.error);
             disconnect();
             return;
          }
          
          if (msg.audio && outputCtx) {
            const pcm = base64ToPcm(msg.audio);
            const audioBuffer = outputCtx.createBuffer(1, pcm.length, 24000);
            audioBuffer.copyToChannel(pcm, 0);

            const source = outputCtx.createBufferSource();
            source.buffer = audioBuffer;
            if (aiAnalyserRef.current) {
              source.connect(aiAnalyserRef.current);
            }
            source.connect(outputCtx.destination);

            const currentTime = outputCtx.currentTime;
            if (nextStartTimeRef.current < currentTime + 0.05) {
              nextStartTimeRef.current = currentTime + 0.05;
            }

            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
          }

          if (msg.interrupted && outputCtx) {
            console.log("Interrupted!");
            outputCtx.close();
            const newCtx = new AudioContext({ sampleRate: 24000 });
            outputCtxRef.current = newCtx;
            
            // Recreate ai analyser for the new context
            aiAnalyserRef.current = newCtx.createAnalyser();
            aiAnalyserRef.current.fftSize = 256;
            
            nextStartTimeRef.current = 0;
          }

          if (msg.text) {
             setChatHistory(prev => {
                const last = prev[prev.length - 1];
                if (last && last.sender === 'ai' && (new Date().getTime() - last.timestamp.getTime()) < 2000) {
                    return [...prev.slice(0, -1), { ...last, text: last.text + msg.text }];
                }
                return [...prev, { sender: 'ai', text: msg.text, timestamp: new Date() }];
             });
          }

          if (msg.action === "show_owner_image") {
            setShowOwner(true);
          } else if (msg.action === "show_website") {
            setWebsiteResult({ url: msg.url, name: msg.name, description: msg.description });
          } else if (msg.action === "update_system_instructions") {
            const newRule = msg.new_rule;
            (async () => {
              try {
                const { db } = await import('../lib/firebase');
                const { doc, getDoc, setDoc } = await import('firebase/firestore');
                const docRef = doc(db, 'ai_settings', 'instruction');
                const docSnap = await getDoc(docRef);
                let currentText = "";
                if (docSnap.exists()) {
                  currentText = docSnap.data().text + "\n\n";
                }
                const updatedText = currentText + "New Rule from Admin: " + newRule;
                await setDoc(docRef, { text: updatedText });
                console.log("Successfully saved new rule to DB:", newRule);
              } catch (e) {
                console.error("Failed to save new rule to DB", e);
              }
            })();
          }
        } catch (e) {
          console.error("Error processing message:", e);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket Error', err);
        setError('WebSocket error occurred.');
        disconnect();
      };

      ws.onclose = () => {
        console.log("WebSocket Closed");
        disconnect();
      };
    } catch (err: any) {
      setError(err.message || "Failed to initialize");
      disconnect();
    }
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setIsConnecting(false);

    if (processorRef.current && inputCtxRef.current) {
      processorRef.current.disconnect();
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e){}
      recognitionRef.current = null;
    }
    stopScreenShare();
    if (inputCtxRef.current) {
      inputCtxRef.current.close();
    }
    if (outputCtxRef.current) {
      outputCtxRef.current.close();
    }

    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    wsRef.current = null;
    inputCtxRef.current = null;
    outputCtxRef.current = null;
    nextStartTimeRef.current = 0;
    setShowOwner(false);
    setWebsiteResult(null);
    setUserVolume(0);
    setAiVolume(0);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [stopScreenShare]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { isConnected, isConnecting, error, showOwner, isScreenSharing, websiteResult, userVolume, aiVolume, chatHistory, connect, disconnect, startScreenShare, stopScreenShare };
}
