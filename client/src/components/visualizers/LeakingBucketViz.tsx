import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BucketState } from '../../types';

interface LeakingBucketVizProps {
  state: BucketState;
  isActive: boolean;
}

export const LeakingBucketViz: React.FC<LeakingBucketVizProps> = ({ state, isActive }) => {
  const capacity = state.capacity || 10;
  const queueSize = state.queueSize ?? 0;
  const queuePercent = Math.min(100, (queueSize / capacity) * 100);

  const fillColor = queuePercent > 80 ? '#EF4444' : queuePercent > 50 ? '#F59E0B' : '#10B981';

  // Generate queue items
  const queueItems = Array.from({ length: Math.min(queueSize, capacity) }, (_, i) => ({
    id: i,
    position: i / capacity,
  }));

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="flex items-start gap-6">
        {/* Incoming requests side */}
        <div className="flex flex-col items-center gap-2 w-20">
          <div className="text-xs text-slate-400 text-center">Incoming</div>
          <AnimatePresence>
            {isActive && (
              <motion.div
                key={Date.now()}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  boxShadow: '0 0 10px rgba(99, 102, 241, 0.6)',
                }}
                initial={{ x: -30, opacity: 0, scale: 0.5 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: 30, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                →
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bucket */}
        <div className="flex flex-col items-center">
          {/* Bucket body */}
          <div
            className="relative w-28 rounded-b-3xl rounded-t-lg overflow-hidden border-2"
            style={{
              height: '160px',
              borderColor: fillColor,
              boxShadow: `0 0 20px rgba(${fillColor === '#EF4444' ? '239,68,68' : fillColor === '#F59E0B' ? '245,158,11' : '16,185,129'},0.3)`,
              background: 'rgba(15,23,42,0.9)',
            }}
          >
            {/* Background fill */}
            <motion.div
              className="absolute bottom-0 left-0 right-0"
              style={{ background: fillColor, opacity: 0.12 }}
              animate={{ height: `${queuePercent}%` }}
              transition={{ type: 'spring', stiffness: 80, damping: 20 }}
            />

            {/* Queue items */}
            <div className="absolute inset-0 flex flex-col-reverse items-center justify-start gap-1 p-2">
              <AnimatePresence>
                {queueItems.map((item) => (
                  <motion.div
                    key={item.id}
                    className="w-16 h-4 rounded flex items-center justify-center text-xs"
                    style={{
                      background: `linear-gradient(90deg, ${fillColor}33, ${fillColor}55)`,
                      border: `1px solid ${fillColor}66`,
                    }}
                    initial={{ scale: 0, y: -10 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0, y: 20, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <span style={{ color: fillColor, fontSize: '9px' }}>req</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Leak hole at bottom */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-2 rounded-t-none rounded-b-full"
              style={{
                background: '#10B981',
                boxShadow: '0 0 8px #10B981',
                opacity: isActive ? 1 : 0.3,
              }}
            />
          </div>

          {/* Drip animation */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                className="w-2 h-4 rounded-full"
                style={{ background: '#10B981', boxShadow: '0 0 6px #10B981', marginTop: '-2px' }}
                initial={{ scaleY: 0, opacity: 1 }}
                animate={{ scaleY: 1, y: 10, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeIn' }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Processed side */}
        <div className="flex flex-col items-center gap-2 w-20">
          <div className="text-xs text-slate-400 text-center">Processed</div>
          <AnimatePresence>
            {isActive && (
              <motion.div
                key={`out-${Date.now()}`}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)',
                }}
                initial={{ opacity: 0, scale: 0.5, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                ✓
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-6 text-center mt-1">
        <div>
          <div className="text-2xl font-bold" style={{ color: fillColor }}>{queueSize}</div>
          <div className="text-xs text-slate-400">Queue</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-300">{capacity}</div>
          <div className="text-xs text-slate-400">Capacity</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-300">{state.leakRate ?? 2}/s</div>
          <div className="text-xs text-slate-400">Leak Rate</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${fillColor}, ${fillColor}88)` }}
          animate={{ width: `${queuePercent}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        />
      </div>
    </div>
  );
};
