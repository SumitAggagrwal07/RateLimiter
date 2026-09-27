import React from 'react';
import { motion } from 'framer-motion';
import type { BucketState } from '../../types';

interface FixedWindowVizProps {
  state: BucketState;
  isActive: boolean;
}

export const FixedWindowViz: React.FC<FixedWindowVizProps> = ({ state, isActive }) => {
  const limit = state.limit || 10;
  const count = state.count ?? 0;
  const fillPercent = Math.min(100, (count / limit) * 100);
  const windowMs = state.windowMs || 10000;
  const timeRemainingMs = state.timeRemainingMs ?? windowMs;
  const timePercent = Math.min(100, Math.max(0, (timeRemainingMs / windowMs) * 100));

  const fillColor = fillPercent > 90 ? '#EF4444' : fillPercent > 60 ? '#F59E0B' : '#10B981';

  // Request blocks visualization
  const blocks = Array.from({ length: limit }, (_, i) => ({
    id: i,
    filled: i < count,
  }));

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Window timer */}
      <div className="w-full">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Window Progress</span>
          <span>{(timeRemainingMs / 1000).toFixed(1)}s remaining</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden relative">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #6366F1, #8B5CF6)' }}
            animate={{ width: `${timePercent}%` }}
            transition={{ duration: 0.5, ease: 'linear' }}
          />
          {/* Window reset flash */}
          {timePercent < 5 && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: 'rgba(99,102,241,0.3)' }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.5, repeat: 3 }}
            />
          )}
        </div>
      </div>

      {/* Request counter display */}
      <div className="flex flex-col items-center gap-2 w-full">
        <div
          className="text-4xl font-black"
          style={{
            color: fillColor,
            textShadow: `0 0 20px ${fillColor}`,
          }}
        >
          {count} / {limit}
        </div>
        <div className="text-sm text-slate-400">Requests in current window</div>
      </div>

      {/* Block grid */}
      <div
        className="grid gap-1 p-3 rounded-xl border"
        style={{
          gridTemplateColumns: `repeat(${Math.min(10, limit)}, 1fr)`,
          borderColor: `${fillColor}44`,
          background: 'rgba(15,23,42,0.6)',
          maxWidth: '220px',
        }}
      >
        {blocks.map(({ id, filled }) => (
          <motion.div
            key={id}
            className="w-5 h-5 rounded-sm"
            style={{
              background: filled
                ? `linear-gradient(135deg, ${fillColor}, ${fillColor}88)`
                : 'rgba(51,65,85,0.8)',
              border: `1px solid ${filled ? fillColor + '66' : 'rgba(71,85,105,0.5)'}`,
              boxShadow: filled ? `0 0 4px ${fillColor}88` : 'none',
            }}
            animate={{
              scale: filled && id === count - 1 && isActive ? [1, 1.2, 1] : 1,
            }}
            transition={{ duration: 0.2 }}
          />
        ))}
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

      {/* Stats */}
      <div className="flex gap-6 text-center">
        <div>
          <div className="text-xl font-bold" style={{ color: fillColor }}>{count}</div>
          <div className="text-xs text-slate-400">Used</div>
        </div>
        <div>
          <div className="text-xl font-bold text-slate-300">{Math.max(0, limit - count)}</div>
          <div className="text-xs text-slate-400">Remaining</div>
        </div>
        <div>
          <div className="text-xl font-bold text-slate-300">{(windowMs / 1000).toFixed(0)}s</div>
          <div className="text-xs text-slate-400">Window</div>
        </div>
      </div>
    </div>
  );
};
