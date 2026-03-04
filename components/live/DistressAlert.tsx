'use client';

import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';

type DistressAlertProps = {
  visible: boolean;
};

export default function DistressAlert({ visible }: DistressAlertProps) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center justify-center gap-2 text-red-400 bg-red-950/40 backdrop-blur-md border border-red-500/30 px-6 py-3 rounded-full text-[10px] tracking-widest uppercase font-bold mx-auto w-fit"
    >
      <AlertCircle size={16} />
      <span>Mode Écoute Sécurisée Activé</span>
    </motion.div>
  );
}
