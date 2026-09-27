import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BucketState, LogEntry } from '../../types';

interface SlidingWindowVizProps {
  state: BucketState;
  isActive: boolean;
}

export const SlidingWindowViz: React.FC<SlidingWindowVizProps> = ({ state, isActive }) => {
  const limit = state.limit || 10;
  const count = state.count ?? 0;
  const windowMs = state.windowMs || 10000;
  const logEntries: LogEntry[] = state.logEntries || [];
  const fillPercent = Math.min(100, (count / limit) * 100);

  const fillColor = fillPercent > 90 ? '#EF4444' : fillPercent > 60 ? '#F59E0B' : '#10B981';

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Timeline header */}
      <div className="flex justify-between text-xs text-slate-400 w-full">
        <span>← {(windowMs / 1000).toFixed(0)}s ago</span>
        <span className="text-slate-300 font-medium">Sliding Window Log</span>
        <span>Now →</span>
      </div>

      {/* Timeline container */}
      <div
        className="relative w-full rounded-xl overflow-hidden border"
        style={{
          height: '100px',
          borderColor: `${fillColor}44`,
          background: 'rgba(15,23,42,0.8)',
        }}
      >
        {/* Window boundary lines */}
        <div
          className="absolute top-0 bottom-0 right-0 w-0.5 opacity-50"
          style={{ background: '#6366F1' }}
        />
        <div
          className="absolute top-0 bottom-0 left-0 w-0.5 opacity-30"
          style={{ background: '#475569' }}
        />

        {/* Background gradient for active window */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(90deg, rgba(15,23,42,0) 0%, rgba(99,102,241,0.05) 100%)' }}
        />

        {/* Log entry dots on timeline */}
        <AnimatePresence>
          {logEntries.map((entry) => {
            const xPercent = Math.max(0, Math.min(100, ((windowMs - entry.age) / windowMs) * 100));
            const isExpiring = entry.age > windowMs * 0.8;

            return (
              <motion.div
                key={entry.id}
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                style={{
                  left: `${xPercent}%`,
                  background: isExpiring
                    ? `radial-gradient(circle, #EF4444, #EF444488)`
                    : `radial-gradient(circle, ${fillColor}, ${fillColor}88)`,
                  boxShadow: `0 0 8px ${isExpiring ? '#EF4444' : fillColor}`,
                }}
                initial={{ scale: 0, y: '-50%' }}
                animate={{ scale: 1, y: '-50%' }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                title={`Age: ${(entry.age / 1000).toFixed(1)}s`}
              />
            );
          })}
        </AnimatePresence>

        {/* Time markers */}
        {[0, 25, 50, 75, 100].map((pct) => (
          <div
            key={pct}
            className="absolute top-0 bottom-0 w-px opacity-10"
            style={{ left: `${pct}%`, background: '#94A3B8' }}
          />
        ))}

        {/* Count label */}
        <div
          className="absolute bottom-2 right-2 text-xs font-bold px-2 py-0.5 rounded"
          style={{
            color: fillColor,
            background: `${fillColor}22`,
            border: `1px solid ${fillColor}44`,
          }}
        >
          {count}/{limit} active
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-6 text-center">
        <div>
          <div className="text-2xl font-bold" style={{ color: fillColor }}>{count}</div>
          <div className="text-xs text-slate-400">In Window</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-300">{Math.max(0, limit - count)}</div>
          <div className="text-xs text-slate-400">Available</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-300">{(windowMs / 1000).toFixed(0)}s</div>
          <div className="text-xs text-slate-400">Window</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${fillColor}, ${fillColor}88)` }}
          animate={{ width: `${fillPercent}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        />
      </div>
    </div>
  );
};
