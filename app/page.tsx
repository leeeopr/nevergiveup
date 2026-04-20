'use client';

import { motion } from 'motion/react';

export default function Page() {
  return (
    <div className="relative min-h-screen bg-white text-ink overflow-hidden font-sans selection:bg-ink selection:text-white">
      {/* Grid Overlay */}
      <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none -z-10" />

      {/* Header */}
      <header className="absolute top-0 w-full p-10 flex justify-between items-baseline z-10">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[13px] font-semibold tracking-[0.1em] uppercase"
        >
          Orizon
        </motion.div>
        <nav className="flex gap-6">
          {['Archive', 'Focus', 'Settings'].map((item, i) => (
            <motion.a
              key={item}
              href="#"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className="text-[13px] text-muted hover:text-ink transition-colors lowercase no-underline"
            >
              {item}
            </motion.a>
          ))}
        </nav>
      </header>

      {/* Main Canvas */}
      <main className="flex-1 min-h-screen flex items-center justify-center p-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-[500px]"
        >
          <h1 className="font-serif italic text-3xl md:text-[32px] opacity-90 mb-2 border-none outline-none focus:ring-0">
            Begin here
          </h1>
          <div className="text-base text-muted leading-relaxed">
            The page is empty, the potential is not. Every great project starts as a single line on a white screen.
            <motion.span 
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "steps(2)" }}
              className="inline-block w-[1px] h-[1.2em] bg-ink align-middle ml-0.5" 
            />
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 w-full p-10 flex justify-between items-end text-[11px] text-muted uppercase tracking-[0.05em] z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          UTF-8 — Word count: 18
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          v 1.0.4 — 2024
        </motion.div>
      </footer>
    </div>
  );
}
