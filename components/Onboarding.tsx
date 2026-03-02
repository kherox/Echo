'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Check, ArrowRight, ShieldAlert } from 'lucide-react';

type OnboardingProps = {
  onComplete: (data: {
    firstName: string;
    birthYear: number;
    tonePreference: 'formal' | 'familiar';
  }) => void;
};

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [tonePreference, setTonePreference] = useState<'formal' | 'familiar'>('formal');
  const [consent, setConsent] = useState(false);

  const handleNext = () => {
    if (step === 1 && firstName.trim() && birthYear.trim()) {
      setStep(2);
    } else if (step === 2 && consent) {
      onComplete({
        firstName: firstName.trim(),
        birthYear: parseInt(birthYear, 10),
        tonePreference,
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0502] p-6 font-serif text-white overflow-hidden relative">
      {/* Immersive Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#5A5A40]/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="mb-12 text-center">
          <div className="w-16 h-16 bg-[#5A5A40] rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg">
            <Mic size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-light mb-2">Bienvenue sur L&apos;Écho</h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em] font-sans font-bold">Votre compagnon de récit</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl space-y-6"
            >
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Comment souhaitez-vous que je vous appelle ?</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] transition-all font-sans"
                  placeholder="Votre prénom"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quelle est votre année de naissance ?</label>
                <input
                  type="number"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] transition-all font-sans"
                  placeholder="Ex: 1945"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Comment préférez-vous que je m&apos;adresse à vous ?</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setTonePreference('formal')}
                    className={`flex-1 py-4 rounded-xl border transition-all font-sans text-sm ${
                      tonePreference === 'formal'
                        ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    Vouvoiement
                  </button>
                  <button
                    onClick={() => setTonePreference('familiar')}
                    className={`flex-1 py-4 rounded-xl border transition-all font-sans text-sm ${
                      tonePreference === 'familiar'
                        ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    Tutoiement
                  </button>
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={!firstName.trim() || !birthYear.trim()}
                className="w-full py-4 bg-[#5A5A40] text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:bg-[#4a4a35]"
              >
                Continuer <ArrowRight size={20} />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl space-y-6"
            >
              <div className="bg-white/5 p-6 rounded-2xl space-y-4 border border-white/5">
                <div className="flex items-start gap-3 text-[#5A5A40]">
                  <ShieldAlert className="shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="font-semibold mb-1 text-gray-200">Confidentialité et Sécurité</h3>
                    <p className="text-xs text-gray-400 font-sans leading-relaxed">
                      L&apos;Écho est conçu pour écouter et se souvenir de vos récits. 
                      Vos données sont chiffrées et stockées de manière sécurisée. 
                      Vous pouvez à tout moment me demander d&apos;oublier un souvenir.
                    </p>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className={`mt-1 w-6 h-6 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  consent ? 'bg-[#5A5A40] border-[#5A5A40]' : 'border-white/10 bg-white/5 group-hover:border-[#5A5A40]'
                }`}>
                  {consent && <Check size={16} className="text-white" />}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span className="text-xs text-gray-400 font-sans leading-relaxed">
                  Je consens à ce que L&apos;Écho écoute ma voix, transcrive mes paroles et mémorise mes récits pour enrichir nos conversations futures.
                </span>
              </label>

              <button
                onClick={handleNext}
                disabled={!consent}
                className="w-full py-4 bg-[#5A5A40] text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:bg-[#4a4a35]"
              >
                Commencer l&apos;expérience <Mic size={20} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
