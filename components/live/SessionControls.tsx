'use client';

import { motion } from 'motion/react';
import { Mic, MicOff, PhoneOff } from 'lucide-react';

type SessionControlsProps = {
  isConnected: boolean;
  isRecording: boolean;
  startSession: () => void;
  toggleMute: () => void;
  handleEndSession: () => void;
};

export default function SessionControls({
  isConnected,
  isRecording,
  startSession,
  toggleMute,
  handleEndSession,
}: SessionControlsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-center items-center gap-10 mt-6 mb-8"
    >
      {!isConnected ? (
        <button onClick={startSession} className="group relative w-20 h-20 flex items-center justify-center">
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
  );
}
