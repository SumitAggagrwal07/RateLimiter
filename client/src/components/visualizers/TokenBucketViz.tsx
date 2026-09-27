import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BucketState } from '../../types';

interface TokenBucketVizProps {
  state: BucketState;
  isActive: boolean;
}

export const TokenBucketViz: React.FC<TokenBucketVizProps> = ({ state, isActive }) => {
  const capacity = state.capacity || 10;
  const tokens = state.tokens ?? capacity;
  const fillPercent = Math.min(100, Math.max(0, (tokens / capacity) * 100));

  // Generate token positions
  const tokenGrid = [];
  const cols = Math.min(5, capacity);
  const rows = Math.ceil(capacity / cols);

  for (let i = 0; i < capacity; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const isPresent = i < tokens;
    tokenGrid.push({ row, col, isPresent, index: i });
  }

  const bucketColor = fillPercent > 60 ? '#10B981' : fillPercent > 30 ? '#F59E0B' : '#EF4444';
  const glowColor = fillPercent > 60 ? 'rgba(16,185,129,0.4)' : fillPercent > 30 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)';

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Bucket container */}
      <div className="relative flex flex-col items-center">
        {/* Refill indicator */}
        <motion.div
          className="text-xs text-slate-400 mb-2 flex items-center gap-1"
          animate={{ opacity: isActive ? [0.5, 1, 0.5] : 0.5 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <span className="text-emerald-400">+</span> Refilling tokens
        </motion.div>

        {/* Bucket shell */}
        <div
          className="relative w-48 rounded-b-3xl rounded-t-lg overflow-hidden border-2 transition-all duration-300"
          style={{
            height: '160px',
            borderColor: bucketColor,
            boxShadow: `0 0 20px ${glowColor}, inset 0 0 20px rgba(0,0,0,0.5)`,
            background: 'rgba(15,23,42,0.9)',
          }}
        >
          {/* Fill level */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 transition-all"
            style={{ background: bucketColor, opacity: 0.15 }}
            animate={{ height: `${fillPercent}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />

          {/* Animated liquid surface */}
          <motion.div
            className="absolute left-0 right-0 h-1 opacity-60"
            style={{ background: bucketColor, bottom: `${fillPercent}%` }}
            animate={{ scaleX: [1, 1.02, 0.98, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          {/* Token grid */}
          <div className="absolute inset-0 flex flex-wrap items-end justify-center p-2 gap-1 pb-4">
            <AnimatePresence>
              {tokenGrid.map(({ isPresent, index }) => (
                isPresent && (
                  <motion.div
                    key={index}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: `radial-gradient(circle, ${bucketColor}, ${bucketColor}88)`,
                      boxShadow: `0 0 6px ${bucketColor}`,
                      fontSize: '8px',
                    }}
                    initial={{ scale: 0, y: -10 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: index * 0.02 }}
                  >
                    ●
                  </motion.div>
                )
              ))}
            </AnimatePresence>
          </div>

          {/* Drain hole at bottom */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1.5 rounded-full"
            style={{ background: isActive ? '#10B981' : '#334155', boxShadow: isActive ? '0 0 8px #10B981' : 'none' }}
          />
        </div>

        {/* Stats */}
        <div className="mt-3 flex gap-6 text-center">
          <div>
            <div className="text-2xl font-bold" style={{ color: bucketColor }}>
              {tokens}
            </div>
            <div className="text-xs text-slate-400">Tokens</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-300">{capacity}</div>
            <div className="text-xs text-slate-400">Capacity</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-300">{fillPercent.toFixed(0)}%</div>
            <div className="text-xs text-slate-400">Full</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${bucketColor}, ${bucketColor}88)` }}
          animate={{ width: `${fillPercent}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        />
      </div>
    </div>
  );
};
