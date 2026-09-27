import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Trash2, RefreshCw } from 'lucide-react';
import type { RequestLogEntry, Algorithm } from '../types';

const algorithmLabels: Record<Algorithm, string> = {
  token_bucket: 'Token Bucket',
  leaking_bucket: 'Leaking Bucket',
  fixed_window: 'Fixed Window',
  sliding_window: 'Sliding Window',
};

export const HistoricalLogs: React.FC = () => {
  const [logs, setLogs] = useState<RequestLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filterAlgorithm, setFilterAlgorithm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchIp, setSearchIp] = useState('');
  const [mongoAvailable, setMongoAvailable] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      if (filterAlgorithm) params.set('algorithm', filterAlgorithm);
      if (filterStatus) params.set('allowed', filterStatus === 'allowed' ? 'true' : 'false');
      if (searchIp) params.set('clientIp', searchIp);

      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();

      if (data.success) {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.message && data.message.includes('MongoDB not connected')) {
          setMongoAvailable(false);
        } else {
          setMongoAvailable(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!confirm('Clear all logs?')) return;
    try {
      await fetch('/api/logs', { method: 'DELETE' });
      setLogs([]);
      setTotal(0);
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filterAlgorithm, filterStatus, searchIp]);

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          Historical Logs
          {!mongoAvailable && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              MongoDB offline
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{total.toLocaleString()} total</span>
          <motion.button
            onClick={fetchLogs}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all"
            whileTap={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
          >
            <RefreshCw size={14} />
          </motion.button>
          <button
            onClick={clearLogs}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Filter by IP..."
            value={searchIp}
            onChange={(e) => { setSearchIp(e.target.value); setPage(1); }}
            className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500"
          />
        </div>

        <select
          value={filterAlgorithm}
          onChange={(e) => { setFilterAlgorithm(e.target.value); setPage(1); }}
          className="px-3 py-1.5 text-xs rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 focus:outline-none focus:border-slate-500"
        >
          <option value="">All Algorithms</option>
          <option value="token_bucket">Token Bucket</option>
          <option value="leaking_bucket">Leaking Bucket</option>
          <option value="fixed_window">Fixed Window</option>
          <option value="sliding_window">Sliding Window</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-1.5 text-xs rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 focus:outline-none focus:border-slate-500"
        >
          <option value="">All Status</option>
          <option value="allowed">Allowed (200)</option>
          <option value="blocked">Blocked (429)</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-auto" style={{ maxHeight: '360px' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <motion.div
              className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <div className="text-4xl mb-3">📋</div>
            <div className="text-sm">
              {mongoAvailable ? 'No logs found. Start the simulator to generate traffic.' : 'Connect MongoDB to enable persistent logging.'}
            </div>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0" style={{ background: 'rgba(15,23,42,0.95)' }}>
              <tr className="text-left text-slate-400 border-b border-slate-700/50">
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">IP</th>
                <th className="pb-2 pr-3 font-medium">Algorithm</th>
                <th className="pb-2 pr-3 font-medium">Latency</th>
                <th className="pb-2 pr-3 font-medium">Quota</th>
                <th className="pb-2 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.requestId}
                  className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors"
                >
                  <td className="py-1.5 pr-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        background: log.allowed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: log.allowed ? '#10B981' : '#EF4444',
                        border: `1px solid ${log.allowed ? '#10B98144' : '#EF444444'}`,
                      }}
                    >
                      {log.statusCode}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 text-slate-300 font-mono">{log.clientIp}</td>
                  <td className="py-1.5 pr-3 text-slate-400">
                    {algorithmLabels[log.algorithm] || log.algorithm}
                  </td>
                  <td className="py-1.5 pr-3 text-slate-300">{log.latencyMs}ms</td>
                  <td className="py-1.5 pr-3 text-slate-400">
                    {log.remaining}/{log.limit}
                  </td>
                  <td className="py-1.5 text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-xs rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 disabled:opacity-30 hover:border-slate-500 transition-all"
          >
            ← Prev
          </button>
          <span className="text-xs text-slate-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-xs rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 disabled:opacity-30 hover:border-slate-500 transition-all"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};
