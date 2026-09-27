import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Algorithm, BucketState, RateLimiterConfig } from '../types';
import { TokenBucketViz } from './visualizers/TokenBucketViz';
import { LeakingBucketViz } from './visualizers/LeakingBucketViz';
import { FixedWindowViz } from './visualizers/FixedWindowViz';
import { SlidingWindowViz } from './visualizers/SlidingWindowViz';

const ALGO_INFO: Record<Algorithm, { name: string; tagline: string; color: string }> = {
  token_bucket: {
    name: 'Token Bucket',
    tagline: 'Burst-tolerant with steady refill rate',
    color: '#10B981',
  },
  leaking_bucket: {
    name: 'Leaking Bucket',
    tagline: 'Smooth constant-rate output',
    color: '#6366F1',
  },
  fixed_window: {
    name: 'Fixed Window',
    tagline: 'Simple per-interval counter',
    color: '#F59E0B',
  },
  sliding_window: {
    name: 'Sliding Window Log',
    tagline: 'Accurate rolling time frame',
    color: '#EC4899',
  },
};

interface AlgorithmVisualizerProps {
  algorithm: Algorithm;
  state: BucketState;
  isActive: boolean;
  config: RateLimiterConfig;
}

export const AlgorithmVisualizer: React.FC<AlgorithmVisualizerProps> = ({
  algorithm,
  state,
  isActive,
  config,
}) => {
  const info = ALGO_INFO[algorithm];

  const VizComponent = {
    token_bucket: TokenBucketViz,
    leaking_bucket: LeakingBucketViz,
    fixed_window: FixedWindowViz,
    sliding_window: SlidingWindowViz,
  }[algorithm];

  return (
    <div className="glass-panel p-6 h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <motion.div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: info.color }}
              animate={isActive ? { scale: [1, 1.4, 1], opacity: [1, 0.7, 1] } : {}}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <h3 className="text-lg font-bold text-white">{info.name}</h3>
          </div>
          <p className="text-sm text-slate-400 mt-0.5 ml-4">{info.tagline}</p>
        </div>
        <motion.div
          className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={{
            background: isActive ? `${info.color}22` : 'rgba(51,65,85,0.5)',
            border: `1px solid ${isActive ? info.color + '44' : 'rgba(71,85,105,0.5)'}`,
            color: isActive ? info.color : '#94A3B8',
          }}
          animate={isActive ? { opacity: [0.7, 1, 0.7] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {isActive ? 'ACTIVE' : 'IDLE'}
        </motion.div>
      </div>

      {/* Visualizer */}
      <AnimatePresence mode="wait">
        <motion.div
          key={algorithm}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <VizComponent state={state} isActive={isActive} />
        </motion.div>
      </AnimatePresence>

      {/* Config hint */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          {algorithm === 'token_bucket' && (
            <>
              <span>Capacity: <span className="text-slate-300">{config.capacity}</span></span>
              <span>Refill: <span className="text-slate-300">{config.refillRate}/s</span></span>
            </>
          )}
          {algorithm === 'leaking_bucket' && (
            <>
              <span>Capacity: <span className="text-slate-300">{config.capacity}</span></span>
              <span>Leak: <span className="text-slate-300">{config.leakRate}/s</span></span>
            </>
          )}
          {(algorithm === 'fixed_window' || algorithm === 'sliding_window') && (
            <>
              <span>Limit: <span className="text-slate-300">{config.limit}</span></span>
              <span>Window: <span className="text-slate-300">{config.windowMs / 1000}s</span></span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
