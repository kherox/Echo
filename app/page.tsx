'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mic, Volume2 } from 'lucide-react';
import Onboarding from '@/components/Onboarding';
import LiveSession from '@/components/LiveSession';

type Profile = {
  firstName: string;
  birthYear: number;
  tonePreference: 'formal' | 'familiar';
};

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check local storage for existing profile
    const savedProfile = localStorage.getItem('echo_profile');
    if (savedProfile) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error('Failed to parse saved profile');
      }
    }
    setIsLoaded(true);
  }, []);

  const handleOnboardingComplete = (data: Profile) => {
    setProfile(data);
    localStorage.setItem('echo_profile', JSON.stringify(data));
    setIsSessionActive(true);
  };

  const handleEndSession = () => {
    setIsSessionActive(false);
  };

  const handleStartSession = () => {
    setIsSessionActive(true);
  };

  if (!isLoaded) {
    return null; // or a loading spinner
  }

  if (!profile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (isSessionActive) {
    return <LiveSession profile={profile} onEndSession={handleEndSession} />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0502] p-6 font-serif text-white overflow-hidden relative">
      {/* Immersive Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#5A5A40]/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-xl rounded-[40px] border border-white/10 shadow-2xl p-10 text-center z-10"
      >
        <div className="mb-8">
          <div className="w-20 h-20 bg-[#5A5A40] rounded-full mx-auto flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(90,90,64,0.3)]">
            <Mic size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-light mb-3 tracking-tight">Bonjour, {profile.firstName}</h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-[0.4em] font-sans font-bold">L&apos;Écho est à votre écoute</p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={handleStartSession}
            className="w-full py-5 bg-[#5A5A40] text-white rounded-2xl font-medium flex items-center justify-center gap-3 transition-all hover:bg-[#4a4a35] hover:scale-[1.02] active:scale-[0.98] shadow-xl border border-white/10"
          >
            Démarrer une session <Volume2 size={20} />
          </button>

          <button
            onClick={() => {
              localStorage.removeItem('echo_profile');
              setProfile(null);
            }}
            className="w-full py-3 text-xs text-gray-500 hover:text-gray-300 transition-colors tracking-widest uppercase font-bold"
          >
            Réinitialiser mon profil
          </button>
        </div>
      </motion.div>

      <div className="absolute bottom-10 text-[10px] text-gray-600 tracking-[0.2em] uppercase font-bold">
        Expérience de récit vocal assistée par IA
      </div>
    </div>
  );
}
