import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Zap, RotateCcw } from 'lucide-react';
import type { Algorithm, RateLimiterConfig, SimulatorConfig } from '../types';

const ALGORITHMS: { value: Algorithm; label: string; color: string }[] = [
  { value: 'token_bucket', label: 'Token Bucket', color: '#10B981' },
  { value: 'leaking_bucket', label: 'Leaking Bucket', color: '#6366F1' },
  { value: 'fixed_window', label: 'Fixed Window', color: '#F59E0B' },
  { value: 'sliding_window', label: 'Sliding Window', color: '#EC4899' },
];

interface ControlPanelProps {
  config: RateLimiterConfig;
  simConfig: SimulatorConfig;
  isRunning: boolean;
  isConnected: boolean;
  onUpdateConfig: (updates: Partial<RateLimiterConfig>) => void;
  onUpdateSimConfig: (updates: Partial<SimulatorConfig>) => void;
  onStart: () => void;
  onStop: () => void;
  onBurst: () => void;
  onClear: () => void;
}

const SliderField: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  color?: string;
}> = ({ label, value, min, max, step = 1, unit = '', onChange, color = '#10B981' }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-xs font-bold text-slate-200">
        {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}{unit}
      </span>
    </div>
    <div className="relative">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(90deg, ${color} ${((value - min) / (max - min)) * 100}%, #1E293B ${((value - min) / (max - min)) * 100}%)`,
          accentColor: color,
        }}
      />
    </div>
  </div>
);

export const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  simConfig,
  isRunning,
  isConnected,
  onUpdateConfig,
  onUpdateSimConfig,
  onStart,
  onStop,
  onBurst,
  onClear,
}) => {
  const selectedAlgo = ALGORITHMS.find((a) => a.value === config.algorithm);

  const handleStart = useCallback(() => {
    if (isRunning) {
      onStop();
    } else {
      onStart();
    }
  }, [isRunning, onStart, onStop]);

  return (
    <div className="glass-panel p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Control Panel</h3>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: isConnected ? '#10B981' : '#EF4444', boxShadow: isConnected ? '0 0 6px #10B981' : 'none' }}
          />
          <span className="text-xs text-slate-400">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Algorithm selector */}
      <div>
        <div className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Algorithm</div>
        <div className="grid grid-cols-2 gap-2">
          {ALGORITHMS.map((algo) => (
            <motion.button
              key={algo.value}
              onClick={() => onUpdateConfig({ algorithm: algo.value })}
              className="px-3 py-2 rounded-lg text-xs font-medium text-left transition-all"
              style={{
                background: config.algorithm === algo.value ? `${algo.color}22` : 'rgba(30,41,59,0.5)',
                border: `1px solid ${config.algorithm === algo.value ? algo.color + '66' : 'rgba(71,85,105,0.4)'}`,
                color: config.algorithm === algo.value ? algo.color : '#94A3B8',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {algo.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-700/50" />

      {/* Algorithm-specific params */}
      <div className="space-y-4">
        <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Algorithm Parameters</div>

        {(config.algorithm === 'token_bucket' || config.algorithm === 'leaking_bucket') && (
          <SliderField
            label="Capacity"
            value={config.capacity}
            min={1}
            max={100}
            onChange={(v) => onUpdateConfig({ capacity: v })}
            color={selectedAlgo?.color}
          />
        )}

        {config.algorithm === 'token_bucket' && (
          <SliderField
            label="Refill Rate"
            value={config.refillRate}
            min={0.1}
            max={50}
            step={0.1}
            unit="/s"
            onChange={(v) => onUpdateConfig({ refillRate: v })}
            color={selectedAlgo?.color}
          />
        )}

        {config.algorithm === 'leaking_bucket' && (
          <SliderField
            label="Leak Rate"
            value={config.leakRate}
            min={0.1}
            max={50}
            step={0.1}
            unit="/s"
            onChange={(v) => onUpdateConfig({ leakRate: v })}
            color={selectedAlgo?.color}
          />
        )}

        {(config.algorithm === 'fixed_window' || config.algorithm === 'sliding_window') && (
          <>
            <SliderField
              label="Request Limit"
              value={config.limit}
              min={1}
              max={100}
              onChange={(v) => onUpdateConfig({ limit: v })}
              color={selectedAlgo?.color}
            />
            <SliderField
              label="Window Duration"
              value={config.windowMs / 1000}
              min={1}
              max={60}
              unit="s"
              onChange={(v) => onUpdateConfig({ windowMs: v * 1000 })}
              color={selectedAlgo?.color}
            />
          </>
        )}
      </div>

      <div className="border-t border-slate-700/50" />

      {/* Simulator controls */}
      <div className="space-y-4">
        <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Traffic Simulator</div>

        <SliderField
          label="Request Rate"
          value={simConfig.rps}
          min={1}
          max={30}
          unit=" RPS"
          onChange={(v) => onUpdateSimConfig({ rps: v })}
          color="#6366F1"
        />

        <SliderField
          label="Burst Multiplier"
          value={simConfig.burstMultiplier}
          min={1}
          max={10}
          unit="x"
          onChange={(v) => onUpdateSimConfig({ burstMultiplier: v })}
          color="#F59E0B"
        />

        <SliderField
          label="Concurrent Clients"
          value={simConfig.concurrentClients}
          min={1}
          max={10}
          onChange={(v) => onUpdateSimConfig({ concurrentClients: v })}
          color="#EC4899"
        />
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <motion.button
          onClick={handleStart}
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm text-white transition-all"
          style={{
            background: isRunning
              ? 'linear-gradient(135deg, #EF4444, #DC2626)'
              : 'linear-gradient(135deg, #10B981, #059669)',
            boxShadow: isRunning ? '0 0 15px rgba(239,68,68,0.4)' : '0 0 15px rgba(16,185,129,0.4)',
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          disabled={!isConnected}
        >
          {isRunning ? <Square size={14} /> : <Play size={14} />}
          {isRunning ? 'Stop' : 'Start'}
        </motion.button>

        <motion.button
          onClick={onBurst}
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm text-white transition-all"
          style={{
            background: 'linear-gradient(135deg, #F59E0B, #D97706)',
            boxShadow: '0 0 15px rgba(245,158,11,0.4)',
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          disabled={!isConnected}
        >
          <Zap size={14} />
          Burst
        </motion.button>

        <motion.button
          onClick={onClear}
          className="col-span-2 flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-slate-400 border border-slate-700/50 hover:border-slate-500 hover:text-slate-200 transition-all"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <RotateCcw size={12} />
          Clear Dashboard
        </motion.button>
      </div>
    </div>
  );
};
