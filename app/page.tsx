'use client';

import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    // Check local storage for existing profile
    const savedProfile = localStorage.getItem('echo_profile');
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error('Failed to parse saved profile');
      }
    }
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

  if (!profile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (isSessionActive) {
    return <LiveSession profile={profile} onEndSession={handleEndSession} />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f5f0] p-6 font-serif text-[#1a1a1a]">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center">
        <h1 className="text-4xl font-light mb-2">Bonjour, {profile.firstName}</h1>
        <p className="text-sm text-gray-500 uppercase tracking-widest mb-8">L'Écho est prêt à vous écouter</p>
        
        <button
          onClick={handleStartSession}
          className="w-full py-4 bg-[#5A5A40] text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all hover:bg-[#4a4a35] shadow-lg"
        >
          Démarrer une session
        </button>

        <button
          onClick={() => {
            localStorage.removeItem('echo_profile');
            setProfile(null);
          }}
          className="mt-6 text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Réinitialiser mon profil
        </button>
      </div>
    </div>
  );
}
