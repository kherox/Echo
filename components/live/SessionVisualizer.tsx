'use client';

import { motion } from 'motion/react';
import { Mic, Volume2, Youtube, X } from 'lucide-react';
import type { ActiveMediaResult } from './types';

type SessionVisualizerProps = {
  activeMedia: ActiveMediaResult | null;
  isSpeaking: boolean;
  isRecording: boolean;
  userVolume: number;
  distressMode: boolean;
  onCloseMedia: () => void;
};

export default function SessionVisualizer({
  activeMedia,
  isSpeaking,
  isRecording,
  userVolume,
  distressMode,
  onCloseMedia,
}: SessionVisualizerProps) {
  if (activeMedia && activeMedia.status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        className="w-full flex flex-col items-center mb-8"
      >
        <div className="w-full relative group">
          <div className="absolute -inset-4 bg-[#5A5A40]/10 rounded-[40px] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] bg-black aspect-video">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${activeMedia.videoId}?autoplay=1&modestbranding=1&rel=0`}
              title={activeMedia.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-between items-center">
              <span className="text-[10px] text-gray-300 tracking-widest uppercase font-bold flex items-center gap-2">
                <Youtube size={14} className="text-red-600" />
                Diffusion Studio Echo
              </span>
              <button
                onClick={onCloseMedia}
                className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center"
        >
          <h4 className="text-lg font-serif italic text-white/90 drop-shadow-lg">{activeMedia.title}</h4>
          <div className="w-12 h-[1px] bg-[#5A5A40] mx-auto mt-3 opacity-60" />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {isSpeaking && (
        <div className="absolute inset-0 flex items-center justify-center">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={`ai-wave-${i}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.8], opacity: [0.6, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.8, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full border border-[#5A5A40]/40"
            />
          ))}
        </div>
      )}

      {isRecording && userVolume > 5 && (
        <div className="absolute inset-0 flex items-center justify-center">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={`user-wave-${i}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: [0.8, 1 + userVolume / 40],
                opacity: [0.4, 0],
                borderWidth: [1, 3, 1],
              }}
              transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.5, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full border border-cyan-500/30"
            />
          ))}
        </div>
      )}

      <motion.div
        animate={{
          scale: isSpeaking ? [1, 1.08, 1] : isRecording && userVolume > 5 ? [1, 1.03, 1] : 1,
          borderColor: distressMode
            ? '#ef4444'
            : isSpeaking
            ? '#5A5A40'
            : isRecording && userVolume > 5
            ? '#06b6d4'
            : 'rgba(255,255,255,0.1)',
          boxShadow: isSpeaking
            ? '0 0 60px rgba(90, 90, 64, 0.4)'
            : isRecording && userVolume > 5
            ? '0 0 40px rgba(6, 182, 212, 0.3)'
            : '0 0 20px rgba(0, 0, 0, 0.5)',
        }}
        transition={{ duration: 0.5 }}
        className={`w-40 h-40 rounded-full flex items-center justify-center z-10 backdrop-blur-xl border-2 transition-all duration-700 ${
          distressMode ? 'bg-red-950/40' : 'bg-white/5'
        }`}
      >
        <div className="relative">
          {isSpeaking ? (
            <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
              <Volume2 size={48} className={distressMode ? 'text-red-400' : 'text-[#d4d4c8]'} />
            </motion.div>
          ) : (
            <motion.div
              animate={{
                scale: isRecording && userVolume > 5 ? 1.2 : 1,
                color: isRecording && userVolume > 5 ? '#06b6d4' : '#9ca3af',
              }}
            >
              <Mic size={48} />
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
