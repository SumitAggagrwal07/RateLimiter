import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Database, Layers, Info } from 'lucide-react';
import { useSocket } from './hooks/useSocket';
import { useSimulator } from './hooks/useSimulator';
import { ControlPanel } from './components/ControlPanel';
import { AlgorithmVisualizer } from './components/AlgorithmVisualizer';
import { LiveCharts } from './components/LiveCharts';
import { RequestTable } from './components/RequestTable';
import { HistoricalLogs } from './components/HistoricalLogs';
import { PacketStream } from './components/PacketStream';

type Tab = 'dashboard' | 'logs';

const ALGO_INFO: Record<string, { name: string; description: string }> = {
  token_bucket: {
    name: 'Token Bucket',
    description: 'Requests consume tokens. Tokens refill at a fixed rate. Allows controlled bursts up to bucket capacity.',
  },
  leaking_bucket: {
    name: 'Leaking Bucket',
    description: 'Requests enter a queue. The queue drains at a constant rate, smoothing bursty traffic into steady output.',
  },
  fixed_window: {
    name: 'Fixed Window Counter',
    description: 'Counts requests in fixed time intervals. Simple and memory-efficient, but susceptible to boundary bursts.',
  },
  sliding_window: {
    name: 'Sliding Window Log',
    description: 'Maintains a log of timestamps. The window slides with time, eliminating boundary bursts. Accurate but memory-intensive.',
  },
};

export default function App() {
  const {
    isConnected,
    recentEvents,
    chartData,
    currentState,
    config,
    totalAllowed,
    totalBlocked,
    updateConfig,
    clearEvents,
  } = useSocket();

  const {
    isRunning,
    simConfig,
    start,
    stop,
    triggerBurst,
    updateSimConfig,
  } = useSimulator();

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showAlgoInfo, setShowAlgoInfo] = useState(false);

  const handleStart = useCallback(() => {
    start(simConfig);
  }, [start, simConfig]);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleBurst = useCallback(() => {
    triggerBurst(simConfig);
  }, [triggerBurst, simConfig]);

  const handleClear = useCallback(() => {
    clearEvents();
    if (isRunning) stop();
  }, [clearEvents, isRunning, stop]);

  // Update sim when rps changes while running
  useEffect(() => {
    if (isRunning) {
      stop();
      start(simConfig);
    }
  }, [simConfig.rps, simConfig.concurrentClients]);

  const algoInfo = ALGO_INFO[config.algorithm];

  return (
    <div className="min-h-screen" style={{ background: '#0F172A' }}>
      {/* Top navigation bar */}
      <header
        className="sticky top-0 z-50 border-b border-slate-800/80"
        style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(16px)' }}
      >
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 0 12px rgba(16,185,129,0.4)' }}
            >
              <Activity size={16} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">Rate Limiter Engine</div>
              <div className="text-xs text-slate-500">Real-Time Visualizer</div>
            </div>
          </div>

          {/* Center — status indicators */}
          <div className="flex items-center gap-6">
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
              style={{
                background: isConnected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${isConnected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}
              animate={isConnected ? { borderColor: ['rgba(16,185,129,0.3)', 'rgba(16,185,129,0.6)', 'rgba(16,185,129,0.3)'] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: isConnected ? '#10B981' : '#EF4444' }}
              />
              <span style={{ color: isConnected ? '#10B981' : '#EF4444' }}>
                {isConnected ? 'Socket Connected' : 'Socket Offline'}
              </span>
            </motion.div>

            {isRunning && (
              <motion.div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#6366F1' }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Simulating {simConfig.rps} RPS
              </motion.div>
            )}
          </div>

          {/* Right — tab switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800/50">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: activeTab === 'dashboard' ? 'rgba(16,185,129,0.15)' : 'transparent',
                color: activeTab === 'dashboard' ? '#10B981' : '#64748B',
              }}
            >
              <Layers size={12} />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: activeTab === 'logs' ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: activeTab === 'logs' ? '#6366F1' : '#64748B',
              }}
            >
              <Database size={12} />
              History
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-screen-2xl mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-12 gap-5"
            >
              {/* LEFT: Control Panel */}
              <div className="col-span-12 lg:col-span-3">
                <ControlPanel
                  config={config}
                  simConfig={simConfig}
                  isRunning={isRunning}
                  isConnected={isConnected}
                  onUpdateConfig={updateConfig}
                  onUpdateSimConfig={updateSimConfig}
                  onStart={handleStart}
                  onStop={handleStop}
                  onBurst={handleBurst}
                  onClear={handleClear}
                />
              </div>

              {/* CENTER + RIGHT: Visualizer + Charts */}
              <div className="col-span-12 lg:col-span-9 space-y-5">
                {/* Algorithm info banner */}
                <motion.div
                  className="flex items-start gap-3 p-4 rounded-xl border border-slate-700/50"
                  style={{ background: 'rgba(30,41,59,0.4)' }}
                  initial={false}
                  animate={{ borderColor: isRunning ? 'rgba(16,185,129,0.3)' : 'rgba(71,85,105,0.5)' }}
                >
                  <Info size={14} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-sm font-semibold text-slate-200">{algoInfo?.name}: </span>
                    <span className="text-sm text-slate-400">{algoInfo?.description}</span>
                  </div>
                </motion.div>

                {/* Packet stream */}
                <PacketStream events={recentEvents} isRunning={isRunning} />

                {/* Algorithm visualizer */}
                <AlgorithmVisualizer
                  algorithm={config.algorithm}
                  state={currentState}
                  isActive={isRunning}
                  config={config}
                />

                {/* Live charts */}
                <LiveCharts
                  chartData={chartData}
                  totalAllowed={totalAllowed}
                  totalBlocked={totalBlocked}
                />

                {/* Request table */}
                <RequestTable events={recentEvents} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="logs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <HistoricalLogs />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-4 px-6 mt-8">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between text-xs text-slate-600">
          <div>Rate Limiter Engine v1.0 · MERN Stack · Socket.io · In-memory fallback active</div>
          <div className="flex items-center gap-4">
            <span>Backend: <span className="text-slate-500">localhost:5000</span></span>
            <span>Frontend: <span className="text-slate-500">localhost:5173</span></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
