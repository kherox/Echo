'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, PhoneOff, AlertCircle, Clock, Volume2 } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { 
  historyAgentDeclaration, 
  cultureAgentDeclaration, 
  archiveMemoryDeclaration, 
  searchMemoriesDeclaration, 
  forgetMemoryDeclaration
} from '@/lib/agent-declarations';

// Initialize the Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

const triggerDistressModeDeclaration = {
  name: 'triggerDistressMode',
  description: 'Déclenche le mode détresse dans l\'interface utilisateur. À appeler UNIQUEMENT si l\'utilisateur exprime une détresse sévère ("en finir", "partir", "douleur insupportable").',
  parameters: {
    type: Type.OBJECT,
    properties: {
      reason: { type: Type.STRING, description: 'La raison du déclenchement' },
    },
    required: ['reason'],
  },
};

type LiveSessionProps = {
  profile: {
    firstName: string;
    birthYear: number;
    tonePreference: 'formal' | 'familiar';
  };
  onEndSession: () => void;
};

export default function LiveSession({ profile, onEndSession }: LiveSessionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userVolume, setUserVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [distressMode, setDistressMode] = useState(false);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  // System instructions based on the profile
  const systemInstruction = `
    Tu es L'Écho, un compagnon de récit vocal pour les seniors.
    Ton rôle est d'écouter activement et d'échanger avec la personne.
    Tu t'adresses à ${profile.firstName}, né(e) en ${profile.birthYear}.
    Tu dois utiliser le ${profile.tonePreference === 'formal' ? 'vouvoiement' : 'tutoiement'}.
    
    RÈGLES STRICTES :
    1. Ne donne JAMAIS de conseils médicaux, financiers ou juridiques. Si on t'en demande, réponds : "C'est une question importante, mais en tant que compagnon de discussion, je ne suis pas en mesure d'y répondre. Qu'en pense votre médecin ou votre entourage ?"
    2. Si tu détectes de la détresse sévère ("en finir", "partir", "douleur insupportable"), bascule en mode Écoute Empathique Limitée et dis : "Je sens que vous traversez un moment difficile. Je suis là pour vous écouter. Avez-vous quelqu'un à qui vous pourriez en parler de vive voix maintenant — un proche, votre médecin ?"
    3. Pratique l'écoute active. Insère des marqueurs d'écoute ("je vois", "en effet").
    4. Sois concis dans tes réponses pour laisser la place au récit.
  `;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isConnected) {
      timer = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isConnected]);

  // Clean up animation frame
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000, // Required by Gemini Live API
      });
    }
    return audioContextRef.current;
  };

  const updateVolume = () => {
    if (!analyserRef.current || !isRecording) {
      setUserVolume(0);
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    let values = 0;
    for (let i = 0; i < dataArray.length; i++) {
      values += dataArray[i];
    }
    const average = values / dataArray.length;
    setUserVolume(average);

    animationFrameRef.current = requestAnimationFrame(updateVolume);
  };

  const playAudioChunk = (base64Audio: string) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    // Decode base64 to binary
    const binaryString = window.atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert to Float32Array (PCM 16-bit to Float32)
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    playbackQueueRef.current.push(float32Array);
    schedulePlayback();
  };

  const schedulePlayback = () => {
    if (isPlayingRef.current || playbackQueueRef.current.length === 0) return;
    
    const ctx = audioContextRef.current;
    if (!ctx) return;

    isPlayingRef.current = true;
    setIsSpeaking(true);

    const chunk = playbackQueueRef.current.shift()!;
    const buffer = ctx.createBuffer(1, chunk.length, 24000);
    buffer.getChannelData(0).set(chunk);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startTime = Math.max(ctx.currentTime, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;

    source.onended = () => {
      isPlayingRef.current = false;
      if (playbackQueueRef.current.length === 0) {
        setIsSpeaking(false);
      } else {
        schedulePlayback();
      }
    };
  };

  const stopPlayback = () => {
    playbackQueueRef.current = [];
    isPlayingRef.current = false;
    setIsSpeaking(false);
    nextPlayTimeRef.current = 0;
  };

  const startSession = async () => {
    try {
      setError(null);
      const ctx = initAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const source = ctx.createMediaStreamSource(stream);
      
      // Analyser for user volume visualization
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);
      updateVolume();

      // Use ScriptProcessor for raw PCM access
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(ctx.destination);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, // Warm, friendly voice
            },
          },
          tools: [{ 
            functionDeclarations: [
              historyAgentDeclaration, 
              cultureAgentDeclaration, 
              triggerDistressModeDeclaration, 
              archiveMemoryDeclaration, 
              searchMemoriesDeclaration, 
              forgetMemoryDeclaration
            ] 
          }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsRecording(true);
            
            // Start sending audio
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Convert Float32 to Int16 PCM
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
              }
              
              // Convert to Base64
              const buffer = new Uint8Array(pcm16.buffer);
              let binary = '';
              for (let i = 0; i < buffer.byteLength; i++) {
                binary += String.fromCharCode(buffer[i]);
              }
              const base64Data = window.btoa(binary);

              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=24000' },
                });
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              playAudioChunk(base64Audio);
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              stopPlayback();
            }

            // Handle tool calls
            const toolCalls = message.toolCall?.functionCalls;
            if (toolCalls && toolCalls.length > 0) {
              const session = await sessionPromise;
              const functionResponses = await Promise.all(
                toolCalls.map(async (call) => {
                  let result = null;
                  try {
                    if (call.name === 'triggerDistressMode') {
                      setDistressMode(true);
                      result = { status: 'success', message: 'Distress mode activated in UI' };
                    } else {
                      // Call the server-side agent API for all other tools
                      const response = await fetch('/api/agents/execute', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ toolName: call.name, args: call.args }),
                      });
                      
                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to execute agent tool');
                      }
                      
                      result = await response.json();
                    }
                  } catch (e) {
                    console.error(`Tool error (${call.name}):`, e);
                  }
                  return {
                    id: call.id,
                    name: call.name,
                    response: result || { status: 'error', message: 'Tool execution failed' },
                  };
                })
              );
              session.sendToolResponse({ functionResponses });
            }
          },
          onclose: () => {
            handleEndSession();
          },
          onerror: (err) => {
            console.error('Live API Error:', err);
            setError('Une erreur de connexion est survenue.');
            handleEndSession();
          },
        },
      });

      sessionRef.current = await sessionPromise;

    } catch (err: any) {
      console.error('Failed to start session:', err);
      setError('Impossible d\'accéder au microphone ou de se connecter au serveur.');
    }
  };

  const handleEndSession = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    stopPlayback();
    setIsConnected(false);
    setIsRecording(false);
    setUserVolume(0);
    onEndSession();
  };

  const toggleMute = () => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsRecording(audioTrack.enabled);
        if (audioTrack.enabled) {
          updateVolume();
        } else {
          setUserVolume(0);
        }
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0502] p-6 font-mono text-white overflow-hidden relative">
      {/* Immersive Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            opacity: isSpeaking ? 0.4 : isRecording && userVolume > 5 ? 0.3 : 0.1,
            scale: isSpeaking ? 1.2 : 1,
          }}
          className={`absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full blur-[120px] transition-colors duration-1000 ${
            distressMode ? 'bg-red-900' : isSpeaking ? 'bg-[#5A5A40]' : 'bg-blue-900'
          }`}
        />
        <motion.div
          animate={{
            opacity: isSpeaking ? 0.3 : isRecording && userVolume > 5 ? 0.4 : 0.1,
            scale: isRecording && userVolume > 5 ? 1.2 : 1,
          }}
          className={`absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[120px] transition-colors duration-1000 ${
            distressMode ? 'bg-orange-900' : isRecording && userVolume > 5 ? 'bg-cyan-900' : 'bg-purple-900'
          }`}
        />
      </div>

      <div className="w-full max-w-lg z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-16 px-4"
        >
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
            <span className="text-[10px] text-gray-400 tracking-[0.2em] uppercase font-sans font-bold">
              {isConnected ? 'Session Active' : 'Connexion...'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <Clock size={14} className="text-[#5A5A40]" />
            <span className="text-xs font-medium tracking-widest">{formatDuration(sessionDuration)}</span>
          </div>
        </motion.div>

        {/* Main Visualization */}
        <div className="flex flex-col items-center justify-center py-12 relative">
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* AI Speaking Waves (Golden/Warm) */}
            {isSpeaking && (
              <div className="absolute inset-0 flex items-center justify-center">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={`ai-wave-${i}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [0.8, 1.8], opacity: [0.6, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.8, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full border border-[#5A5A40]/40"
                  />
                ))}
              </div>
            )}

            {/* User Speaking Waves (Cyan/Cool) */}
            {isRecording && userVolume > 5 && (
              <div className="absolute inset-0 flex items-center justify-center">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={`user-wave-${i}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ 
                      scale: [0.8, 1 + (userVolume / 40)], 
                      opacity: [0.4, 0],
                      borderWidth: [1, 3, 1]
                    }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.5, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full border border-cyan-500/30"
                  />
                ))}
              </div>
            )}
            
            {/* Central Orb */}
            <motion.div
              animate={{ 
                scale: isSpeaking ? [1, 1.08, 1] : isRecording && userVolume > 5 ? [1, 1.03, 1] : 1,
                borderColor: distressMode 
                  ? "#ef4444" 
                  : isSpeaking 
                    ? "#5A5A40" 
                    : isRecording && userVolume > 5 
                      ? "#06b6d4" 
                      : "rgba(255,255,255,0.1)",
                boxShadow: isSpeaking 
                  ? "0 0 60px rgba(90, 90, 64, 0.4)" 
                  : isRecording && userVolume > 5 
                    ? "0 0 40px rgba(6, 182, 212, 0.3)" 
                    : "0 0 20px rgba(0, 0, 0, 0.5)"
              }}
              transition={{ duration: 0.5 }}
              className={`w-40 h-40 rounded-full flex items-center justify-center z-10 backdrop-blur-xl border-2 transition-all duration-700 ${
                distressMode ? 'bg-red-950/40' : 'bg-white/5'
              }`}
            >
              <div className="relative">
                {isSpeaking ? (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Volume2 size={48} className={distressMode ? 'text-red-400' : 'text-[#d4d4c8]'} />
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ 
                      scale: isRecording && userVolume > 5 ? 1.2 : 1,
                      color: isRecording && userVolume > 5 ? "#06b6d4" : "#9ca3af"
                    }}
                  >
                    <Mic size={48} />
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
          
          <div className="mt-16 text-center">
            <motion.div
              key={isSpeaking ? 'ai' : isRecording && userVolume > 5 ? 'user' : 'idle'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <p className={`text-xs tracking-[0.3em] uppercase font-bold ${
                isSpeaking ? 'text-[#5A5A40]' : isRecording && userVolume > 5 ? 'text-cyan-400' : 'text-gray-500'
              }`}>
                {isSpeaking ? "L'Écho s'exprime" : isRecording && userVolume > 5 ? "Vous parlez" : "À votre écoute"}
              </p>
              <p className="text-gray-400 text-[10px] font-sans italic opacity-60">
                {isSpeaking ? "Écoute active en cours..." : isRecording && userVolume > 5 ? "Je vous entends bien" : "Dites quelque chose..."}
              </p>
            </motion.div>
            {error && <p className="text-red-400 text-xs mt-4 bg-red-950/30 px-4 py-2 rounded-lg border border-red-900/50">{error}</p>}
          </div>
        </div>

        {/* Controls */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center items-center gap-10 mt-12 mb-8"
        >
          {!isConnected ? (
            <button
              onClick={startSession}
              className="group relative w-20 h-20 flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-[#5A5A40] rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
              <div className="relative w-full h-full rounded-full bg-[#5A5A40] flex items-center justify-center hover:bg-[#4a4a35] transition-all transform hover:scale-105 shadow-xl border border-white/10">
                <Mic size={28} className="text-white" />
              </div>
            </button>
          ) : (
            <>
              <button
                onClick={toggleMute}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all border ${
                  isRecording 
                    ? 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10' 
                    : 'bg-red-900/30 text-red-400 border-red-900/50 hover:bg-red-900/50'
                }`}
              >
                {isRecording ? <Mic size={24} /> : <MicOff size={24} />}
              </button>
              
              <button
                onClick={handleEndSession}
                className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 transition-all transform hover:scale-105 shadow-[0_0_30px_rgba(220,38,38,0.4)] border border-white/10"
              >
                <PhoneOff size={28} className="text-white" />
              </button>
            </>
          )}
        </motion.div>

        {/* Distress Alert Indicator */}
        {distressMode && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-2 text-red-400 bg-red-950/40 backdrop-blur-md border border-red-500/30 px-6 py-3 rounded-full text-[10px] tracking-widest uppercase font-bold mx-auto w-fit"
          >
            <AlertCircle size={16} />
            <span>Mode Écoute Sécurisée Activé</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

