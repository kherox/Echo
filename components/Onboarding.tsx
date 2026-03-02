'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f5f0] p-6 font-serif text-[#1a1a1a]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-light mb-2">L'Écho</h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest">Votre compagnon de récit</p>
        </div>

        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Comment souhaitez-vous que je vous appelle ?</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all font-sans"
                placeholder="Votre prénom"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quelle est votre année de naissance ?</label>
              <input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all font-sans"
                placeholder="Ex: 1945"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Comment préférez-vous que je m'adresse à vous ?</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setTonePreference('formal')}
                  className={`flex-1 py-3 rounded-xl border transition-all font-sans ${
                    tonePreference === 'formal'
                      ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#5A5A40]'
                  }`}
                >
                  Vouvoiement
                </button>
                <button
                  onClick={() => setTonePreference('familiar')}
                  className={`flex-1 py-3 rounded-xl border transition-all font-sans ${
                    tonePreference === 'familiar'
                      ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#5A5A40]'
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
              <div className="flex items-start gap-3 text-[#5A5A40]">
                <ShieldAlert className="shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-semibold mb-1">Confidentialité et Sécurité</h3>
                  <p className="text-sm text-gray-600 font-sans leading-relaxed">
                    L'Écho est conçu pour écouter et se souvenir de vos récits. 
                    Vos données sont chiffrées et stockées de manière sécurisée. 
                    Vous pouvez à tout moment me demander d'oublier un souvenir.
                  </p>
                </div>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className={`mt-1 w-6 h-6 rounded border flex items-center justify-center shrink-0 transition-colors ${
                consent ? 'bg-[#5A5A40] border-[#5A5A40]' : 'border-gray-300 group-hover:border-[#5A5A40]'
              }`}>
                {consent && <Check size={16} className="text-white" />}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span className="text-sm text-gray-700 font-sans">
                Je consens à ce que L'Écho écoute ma voix, transcrive mes paroles et mémorise mes récits pour enrichir nos conversations futures.
              </span>
            </label>

            <button
              onClick={handleNext}
              disabled={!consent}
              className="w-full py-4 bg-[#5A5A40] text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:bg-[#4a4a35]"
            >
              Commencer l'expérience <Mic size={20} />
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
