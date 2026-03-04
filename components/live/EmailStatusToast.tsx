'use client';

import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import type { EmailStatus } from './types';

type EmailStatusToastProps = {
  status: EmailStatus;
};

export default function EmailStatusToast({ status }: EmailStatusToastProps) {
  if (status.status === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-[#5A5A40] text-white flex items-center gap-3 shadow-2xl border border-white/20"
      >
        <CheckCircle2 size={18} />
        <span className="text-sm font-medium">{status.message ?? 'E-mail envoyé'}</span>
      </motion.div>
    </AnimatePresence>
  );
}
