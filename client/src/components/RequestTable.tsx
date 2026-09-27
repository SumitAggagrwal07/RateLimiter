import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RequestEvent } from '../types';

interface RequestTableProps {
  events: RequestEvent[];
}

const algorithmLabels: Record<string, string> = {
  token_bucket: 'Token Bucket',
  leaking_bucket: 'Leaking Bucket',
  fixed_window: 'Fixed Window',
  sliding_window: 'Sliding Window',
};

export const RequestTable: React.FC<RequestTableProps> = ({ events }) => {
  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Live Request Stream
        </h3>
        <span className="text-xs text-slate-400">{events.length} events</span>
      </div>

      <div className="overflow-auto" style={{ maxHeight: '320px' }}>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <div className="text-4xl mb-3">📡</div>
            <div className="text-sm">Start the simulator to see live requests</div>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0" style={{ background: 'rgba(15,23,42,0.95)' }}>
              <tr className="text-left text-slate-400 border-b border-slate-700/50">
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Request ID</th>
                <th className="pb-2 pr-3 font-medium">Client IP</th>
                <th className="pb-2 pr-3 font-medium">Algorithm</th>
                <th className="pb-2 pr-3 font-medium">Latency</th>
                <th className="pb-2 pr-3 font-medium">Remaining</th>
                <th className="pb-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {events.slice(0, 50).map((event, idx) => (
                  <motion.tr
                    key={event.requestId}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                    initial={{ opacity: 0, x: -10, backgroundColor: event.allowed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}
                    animate={{ opacity: 1, x: 0, backgroundColor: 'transparent' }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, delay: idx === 0 ? 0 : 0 }}
                  >
                    <td className="py-1.5 pr-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{
                          background: event.allowed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: event.allowed ? '#10B981' : '#EF4444',
                          border: `1px solid ${event.allowed ? '#10B98144' : '#EF444444'}`,
                        }}
                      >
                        {event.allowed ? '200' : '429'}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 text-slate-400 font-mono">
                      {event.requestId.slice(0, 8)}…
                    </td>
                    <td className="py-1.5 pr-3 text-slate-300 font-mono">{event.clientIp}</td>
                    <td className="py-1.5 pr-3 text-slate-400">
                      {algorithmLabels[event.algorithm] || event.algorithm}
                    </td>
                    <td className="py-1.5 pr-3 text-slate-300">
                      {event.latencyMs}ms
                    </td>
                    <td className="py-1.5 pr-3">
                      <div className="flex items-center gap-1">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(40, (event.remaining / event.limit) * 40)}px`,
                            background: event.remaining > event.limit * 0.5 ? '#10B981' : event.remaining > 0 ? '#F59E0B' : '#EF4444',
                          }}
                        />
                        <span className="text-slate-400">{event.remaining}/{event.limit}</span>
                      </div>
                    </td>
                    <td className="py-1.5 text-slate-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
