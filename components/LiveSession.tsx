'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Clock } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import {
  historyAgentDeclaration,
  cultureAgentDeclaration,
  archiveMemoryDeclaration,
  searchMemoriesDeclaration,
  forgetMemoryDeclaration,
  atlasAgentDeclaration,
  mediaControlDeclaration,
  sendEmailDeclaration,
  listEmailsDeclaration
} from '@/lib/agent-declarations';
import type { ActiveMediaResult, EmailStatus, SearchResultItem } from './live/types';
import SessionVisualizer from './live/SessionVisualizer';
import SearchResultsOverlay from './live/SearchResultsOverlay';
import EmailStatusToast from './live/EmailStatusToast';
import SessionControls from './live/SessionControls';
import DistressAlert from './live/DistressAlert';


// triggerDistressMode tool declaration
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
  const [activeMedia, setActiveMedia] = useState<ActiveMediaResult | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [showResults, setShowResults] = useState(false);


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
    
    CAPACITÉS SPÉCIALES :
    - Tu as accès à **Atlas**, une recherche Google en temps réel. Si l'utilisateur pose une question sur l'actualité, la météo, ou veut en savoir plus sur un sujet récent, utilise l'outil 'atlasSearch'.
    - Tu peux rechercher des vidéos ou de la musique via l'outil 'controlMedia'.
    - Tu peux explorer des faits historiques via 'chronosSearch'.
    - Tu peux sauvegarder ou lire des souvenirs via les outils de mémoire.
    - Tu peux envoyer des e-mails via 'sendEmail' et consulter la boîte de réception via 'listEmails'. Si l'utilisateur veut envoyer un message à un proche ou résumer la discussion, demande-lui l'adresse et le sujet s'ils ne sont pas clairs.

    RÈGLES STRICTES :
    1. Ne donne JAMAIS de conseils médicaux, financiers ou juridiques.
    2. Si tu détectes de la détresse sévère, bascule en mode Écoute Empathique Limitée.
    3. Pratique l'écoute active.
    4. Sois concis dans tes réponses orales, mais n'hésite pas à lancer une recherche 'atlasSearch' pour afficher des résultats visuels riches à l'écran si le sujet le justifie.
  `;

  const [emailStatus, setEmailStatus] = useState<EmailStatus>({ status: 'idle' });

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

      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.API_KEY ||
        process.env.GOOGLE_API_KEY;

      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        throw new Error('Gemini API key is missing or invalid. Please configure it in the Secrets panel.');
      }

      const ai = new GoogleGenAI({ apiKey });

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
              forgetMemoryDeclaration,
              atlasAgentDeclaration,
              mediaControlDeclaration,
              sendEmailDeclaration,
              listEmailsDeclaration
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

                      // UI Side Effects based on tool result
                      if (call.name === 'atlasSearch') {
                        setSearchResults(result.renderedContent
                          ? [{ renderedContent: result.renderedContent }]
                          : (result.results || (result.answer ? [{ title: 'Réponse', snippet: result.answer }] : []))
                        );
                        setShowResults(true);
                      } else if (call.name === 'controlMedia') {
                        setActiveMedia(result);
                        if (result.status === 'success') setShowResults(false);
                      } else if (call.name === 'sendEmail') {
                        const args = call.args as { to?: string } | undefined;
                        const recipient = args?.to || 'destinataire';
                        setEmailStatus({ status: 'success', message: `E-mail envoyé à ${recipient}` });
                        setTimeout(() => setEmailStatus({ status: 'idle' }), 5000);
                      }
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
            opacity: isSpeaking ? 0.6 : isRecording && userVolume > 5 ? 0.4 : 0.2,
            scale: isSpeaking ? 1.4 : 1.1,
            rotate: [0, 10, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className={`absolute top-[-25%] left-[-15%] w-[80%] h-[80%] rounded-full blur-[140px] transition-colors duration-[2000ms] ${distressMode ? 'bg-red-900/40' : isSpeaking ? 'bg-[#5A5A40]/40' : 'bg-blue-950/40'
            }`}
        />
        <motion.div
          animate={{
            opacity: isSpeaking ? 0.4 : isRecording && userVolume > 5 ? 0.5 : 0.2,
            scale: isRecording && userVolume > 5 ? 1.4 : 1.1,
            rotate: [0, -10, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className={`absolute bottom-[-25%] right-[-15%] w-[80%] h-[80%] rounded-full blur-[140px] transition-colors duration-[2000ms] ${distressMode ? 'bg-orange-900/40' : isRecording && userVolume > 5 ? 'bg-cyan-950/40' : 'bg-purple-950/40'
            }`}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0a0502_100%)]" />
      </div>

      <div className="w-full max-w-lg z-10 flex flex-col min-h-[600px] justify-center relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8 px-4"
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

        {/* Main Content Area (Dynamic) */}
        <div className="flex-1 flex flex-col items-center justify-center py-6 relative">
          <SessionVisualizer
            activeMedia={activeMedia}
            isSpeaking={isSpeaking}
            isRecording={isRecording}
            userVolume={userVolume}
            distressMode={distressMode}
            onCloseMedia={() => setActiveMedia(null)}
          />

          <div className="mt-12 text-center">
            <motion.div
              key={isSpeaking ? 'ai' : isRecording && userVolume > 5 ? 'user' : 'idle'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <p
                className={`text-xs tracking-[0.3em] uppercase font-bold ${
                  isSpeaking ? 'text-[#5A5A40]' : isRecording && userVolume > 5 ? 'text-cyan-400' : 'text-gray-500'
                }`}
              >
                {activeMedia ? 'Mode Studio Activé' : isSpeaking ? "L'Écho s'exprime" : isRecording && userVolume > 5 ? 'Vous parlez' : 'À votre écoute'}
              </p>
              <p className="text-gray-400 text-[10px] font-sans italic opacity-60">
                {activeMedia
                  ? activeMedia.title
                  : isSpeaking
                  ? 'Écoute active en cours...'
                  : isRecording && userVolume > 5
                  ? 'Je vous entends bien'
                  : 'Dites quelque chose...'}
              </p>
            </motion.div>
            {error && <p className="text-red-400 text-xs mt-4 bg-red-950/30 px-4 py-2 rounded-lg border border-red-900/50">{error}</p>}
          </div>

          <SearchResultsOverlay show={showResults} results={searchResults} onClose={() => setShowResults(false)} />
          <EmailStatusToast status={emailStatus} />
        </div>

        <SessionControls
          isConnected={isConnected}
          isRecording={isRecording}
          startSession={startSession}
          toggleMute={toggleMute}
          handleEndSession={handleEndSession}
        />

        <DistressAlert visible={distressMode} />
      </div>
    </div>
  );
}

