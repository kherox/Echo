'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ExternalLink, Sparkles, X } from 'lucide-react';
import type { SearchResultItem } from './types';

type SearchResultsOverlayProps = {
  show: boolean;
  results: SearchResultItem[];
  onClose: () => void;
};

export default function SearchResultsOverlay({ show, results, onClose }: SearchResultsOverlayProps) {
  return (
    <AnimatePresence>
      {show && results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 40 }}
          className="absolute inset-0 z-20 bg-black/80 backdrop-blur-[40px] rounded-[32px] p-8 border border-white/10 flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)] ring-1 ring-white/5 overflow-hidden"
        >
          <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-[#5A5A40]/10 rounded-full blur-[80px]" />

          <div className="flex justify-between items-center mb-8 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#5A5A40]/20 flex items-center justify-center border border-[#5A5A40]/30 shadow-inner">
                <Sparkles size={20} className="text-[#d4d4c8]" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400">Intelligence Atlas</h3>
                <p className="text-lg font-serif italic text-white/90">Échos du Web</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all group"
            >
              <X size={20} className="text-gray-400 group-hover:text-white transition-colors" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar relative z-10">
            {results.map((result, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, type: 'spring', damping: 20 }}
                className="group p-1 rounded-2xl bg-gradient-to-br from-white/10 to-transparent hover:from-[#5A5A40]/20 hover:to-transparent transition-all duration-500"
              >
                <div className="p-6 rounded-2xl bg-[#0a0502]/60 backdrop-blur-md border border-white/5 group-hover:border-white/10 transition-all">
                  {result.renderedContent ? (
                    <div
                      className="rendered-content text-[15px] leading-relaxed text-gray-300 font-sans"
                      dangerouslySetInnerHTML={{ __html: result.renderedContent }}
                    />
                  ) : (
                    <a href={result.link} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="flex justify-between items-start mb-3 gap-4">
                        <h4 className="text-base font-medium text-white group-hover:text-[#d4d4c8] transition-colors line-clamp-2 leading-snug">
                          {result.title}
                        </h4>
                        <div className="p-2 rounded-lg bg-white/5 group-hover:bg-[#5A5A40]/40 transition-colors">
                          <ExternalLink size={14} className="text-gray-400 group-hover:text-white" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 leading-relaxed font-sans font-light">
                        {result.snippet}
                      </p>
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-white/5 flex justify-center">
            <p className="text-[10px] text-gray-600 tracking-widest uppercase font-bold">Recherche optimisée par L&apos;Écho</p>
          </div>

          <style jsx global>{`
            .rendered-content {
              font-family: 'Inter', system-ui, sans-serif;
              line-height: 1.7;
              letter-spacing: -0.01em;
            }
            .rendered-content a {
              color: #d4d4c8;
              text-decoration: none;
              border-bottom: 1px solid rgba(90, 90, 64, 0.5);
              transition: all 0.2s ease;
            }
            .rendered-content a:hover {
              color: white;
              border-bottom-color: #5A5A40;
              background: rgba(90, 90, 64, 0.1);
            }
            .rendered-content b, .rendered-content strong {
              color: white;
              font-weight: 600;
            }
            .rendered-content h1, .rendered-content h2, .rendered-content h3 {
              color: #d4d4c8;
              font-family: 'serif';
              font-style: italic;
              margin-bottom: 0.5rem;
            }
            .rendered-content ul, .rendered-content ol {
              margin: 1rem 0;
              padding-left: 1.25rem;
            }
            .rendered-content li {
              margin-bottom: 0.5rem;
            }
            .custom-scrollbar::-webkit-scrollbar {
              width: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.1);
              border-radius: 10px;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
