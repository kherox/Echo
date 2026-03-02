'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, PhoneOff, AlertCircle, Clock, Volume2 } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { chronosSearch, melodyRetriever } from '@/lib/tools';
import { archiveMemory, searchMemories } from '@/lib/memory';

// Initialize the Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

const chronosSearchDeclaration: FunctionDeclaration = {
  name: 'chronosSearch',
  description: 'Recherche un fait historique lié au récit de l\'utilisateur. Ne déclencher que si l\'utilisateur mentionne une date ou un lieu.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'Le sujet de la recherche historique' },
      yearHint: { type: Type.NUMBER, description: 'L\'année mentionnée par l\'utilisateur, si applicable' },
    },
    required: ['query'],
  },
};

const melodyRetrieverDeclaration: FunctionDeclaration = {
  name: 'melodyRetriever',
  description: 'Propose une chanson d\'époque quand l\'utilisateur évoque une période ou un événement.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      era: { type: Type.STRING, description: 'La décennie (ex: "1960s", "1970s")' },
      keywords: { type: Type.STRING, description: 'Le thème ou l\'événement évoqué' },
    },
    required: ['era', 'keywords'],
  },
};

const triggerDistressModeDeclaration: FunctionDeclaration = {
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

const archiveMemoryDeclaration: FunctionDeclaration = {
  name: 'archiveMemory',
  description: 'Extrait et stocke un fait biographique nouveau mentionné par l\'utilisateur.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: 'Le résumé du souvenir (max 2000 caractères)' },
      theme: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Tags thématiques (ex: famille, jeunesse, métier)' },
      emotionScore: { type: Type.NUMBER, description: 'Intensité émotionnelle estimée de 1 à 5' },
    },
    required: ['content'],
  },
};

const searchMemoriesDeclaration: FunctionDeclaration = {
  name: 'searchMemories',
  description: 'Recherche des souvenirs sémantiquement proches du sujet en cours.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'Le sujet en cours de discussion' },
    },
    required: ['query'],
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
  const [error, setError] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [distressMode, setDistressMode] = useState(false);
  const [transcripts, setTranscripts] = useState<{ role: string; text: string }[]>([]);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

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
    buffer.copyToChannel(chunk, 0);

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
      // Use ScriptProcessor for raw PCM access (deprecated but widely supported for this use case)
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
          tools: [{ functionDeclarations: [chronosSearchDeclaration, melodyRetrieverDeclaration, triggerDistressModeDeclaration, archiveMemoryDeclaration, searchMemoriesDeclaration] }],
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
                    if (call.name === 'chronosSearch') {
                      const args = call.args as { query: string; yearHint?: number };
                      result = await chronosSearch(args.query, args.yearHint);
                    } else if (call.name === 'melodyRetriever') {
                      const args = call.args as { era: string; keywords: string };
                      result = await melodyRetriever(args.era, args.keywords);
                    } else if (call.name === 'triggerDistressMode') {
                      setDistressMode(true);
                      result = { status: 'success', message: 'Distress mode activated in UI' };
                    } else if (call.name === 'archiveMemory') {
                      const args = call.args as { content: string; theme?: string[]; emotionScore?: number };
                      // Using a dummy profile ID for the MVP if not authenticated
                      const profileId = '00000000-0000-0000-0000-000000000000';
                      result = await archiveMemory(profileId, args.content, args.theme, args.emotionScore);
                    } else if (call.name === 'searchMemories') {
                      const args = call.args as { query: string };
                      const profileId = '00000000-0000-0000-0000-000000000000';
                      result = await searchMemories(profileId, args.query);
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
    onEndSession();
  };

  const toggleMute = () => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsRecording(audioTrack.enabled);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#151619] p-6 font-mono text-white">
      <div className="w-full max-w-md bg-[#1c1d21] rounded-3xl shadow-2xl p-8 relative overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400 tracking-widest uppercase">
              {isConnected ? 'En Ligne' : 'Hors Ligne'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Clock size={14} />
            <span className="text-sm">{formatDuration(sessionDuration)}</span>
          </div>
        </div>

        {/* Main Visualization */}
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Pulsing rings when speaking */}
            {isSpeaking && (
              <>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full border-2 border-[#5A5A40]"
                />
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.5 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full border border-[#5A5A40]"
                />
              </>
            )}
            
            {/* Central Orb */}
            <motion.div
              animate={{ 
                scale: isSpeaking ? [1, 1.05, 1] : 1,
                boxShadow: isSpeaking 
                  ? "0 0 40px rgba(90, 90, 64, 0.6)" 
                  : "0 0 20px rgba(0, 0, 0, 0.5)"
              }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={`w-32 h-32 rounded-full flex items-center justify-center z-10 transition-colors duration-500 ${
                distressMode ? 'bg-red-900/50 border-red-500' : 'bg-[#2a2b30] border-[#3a3b40]'
              } border-2`}
            >
              {isSpeaking ? (
                <Volume2 size={40} className={distressMode ? 'text-red-400' : 'text-[#d4d4c8]'} />
              ) : (
                <Mic size={40} className="text-gray-500" />
              )}
            </motion.div>
          </div>
          
          <div className="mt-8 text-center h-12">
            <p className="text-gray-400 text-sm">
              {isSpeaking ? "L'Écho parle..." : isConnected ? "L'Écho vous écoute..." : "Prêt à commencer"}
            </p>
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-6 mt-8">
          {!isConnected ? (
            <button
              onClick={startSession}
              className="w-16 h-16 rounded-full bg-[#5A5A40] flex items-center justify-center hover:bg-[#4a4a35] transition-colors shadow-lg"
            >
              <Mic size={24} className="text-white" />
            </button>
          ) : (
            <>
              <button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isRecording ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-red-900/50 text-red-400 hover:bg-red-900/70'
                }`}
              >
                {isRecording ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              
              <button
                onClick={handleEndSession}
                className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg"
              >
                <PhoneOff size={20} className="text-white" />
              </button>
            </>
          )}
        </div>

        {/* Distress Alert Indicator */}
        {distressMode && (
          <div className="absolute top-4 right-4 flex items-center gap-2 text-red-400 bg-red-900/20 px-3 py-1.5 rounded-full text-xs">
            <AlertCircle size={14} />
            <span>Mode Écoute Sécurisée</span>
          </div>
        )}
      </div>
    </div>
  );
}
