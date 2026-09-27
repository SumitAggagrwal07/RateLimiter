import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RequestEvent } from '../types';

interface PacketStreamProps {
  events: RequestEvent[];
  isRunning: boolean;
}

interface Packet {
  id: string;
  allowed: boolean;
  x: number;
  startTime: number;
}

export const PacketStream: React.FC<PacketStreamProps> = ({ events, isRunning }) => {
  const [packets, setPackets] = useState<Packet[]>([]);

  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[0];
    const packet: Packet = {
      id: latest.requestId + '-' + Date.now(),
      allowed: latest.allowed,
      x: 0,
      startTime: Date.now(),
    };

    setPackets((prev) => [...prev.slice(-8), packet]);

    // Remove packet after animation
    setTimeout(() => {
      setPackets((prev) => prev.filter((p) => p.id !== packet.id));
    }, 2000);
  }, [events.length > 0 ? events[0].requestId : null]);

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          Packet Stream
        </h3>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Allowed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Blocked
          </span>
        </div>
      </div>

      {/* Stream lane */}
      <div
        className="relative overflow-hidden rounded-xl border border-slate-700/50"
        style={{ height: '80px', background: 'rgba(15,23,42,0.8)' }}
      >
        {/* Gateway icon in middle */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)' }}
          >
            🛡️
          </div>
        </div>

        {/* Lane lines */}
        <div className="absolute inset-0 flex flex-col justify-evenly">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-full h-px bg-slate-800/50" />
          ))}
        </div>

        {/* Labels */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">→ Client</div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">Server →</div>

        {/* Packets */}
        <AnimatePresence>
          {packets.map((packet) => {
            const yPositions = [20, 40, 60];
            const yPos = yPositions[Math.abs(packet.id.charCodeAt(0)) % 3];

            if (packet.allowed) {
              return (
                <motion.div
                  key={packet.id}
                  className="absolute w-4 h-4 rounded-full flex items-center justify-center"
                  style={{
                    top: yPos,
                    background: 'radial-gradient(circle, #10B981, #059669)',
                    boxShadow: '0 0 8px #10B981, 0 0 16px rgba(16,185,129,0.3)',
                  }}
                  initial={{ left: '5%', opacity: 0, scale: 0.5 }}
                  animate={{ left: '90%', opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 0.8] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                />
              );
            } else {
              return (
                <motion.div
                  key={packet.id}
                  className="absolute"
                  style={{ top: yPos }}
                  initial={{ left: '5%' }}
                  animate={{ left: '46%' }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                >
                  <motion.div
                    className="w-4 h-4 rounded-full"
                    style={{
                      background: 'radial-gradient(circle, #EF4444, #DC2626)',
                      boxShadow: '0 0 8px #EF4444',
                    }}
                    animate={{
                      scale: [1, 1.5, 0],
                      opacity: [1, 0.8, 0],
                      borderRadius: ['50%', '30%', '50%'],
                    }}
                    transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
                  />
                </motion.div>
              );
            }
          })}
        </AnimatePresence>

        {/* Idle state */}
        {!isRunning && packets.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-600">
            Start simulator to visualize traffic
          </div>
        )}
      </div>
    </div>
  );
};
