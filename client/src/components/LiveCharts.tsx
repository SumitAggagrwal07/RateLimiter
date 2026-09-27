import React from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ChartDataPoint } from '../types';

interface LiveChartsProps {
  chartData: ChartDataPoint[];
  totalAllowed: number;
  totalBlocked: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel p-3 text-xs">
        <p className="text-slate-400 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: <span className="font-bold">{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const LiveCharts: React.FC<LiveChartsProps> = ({ chartData, totalAllowed, totalBlocked }) => {
  const successRate = totalAllowed + totalBlocked > 0
    ? Math.round((totalAllowed / (totalAllowed + totalBlocked)) * 100)
    : 100;

  return (
    <div className="glass-panel p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Throughput
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-400">Allowed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-slate-400">Blocked</span>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <motion.div
          className="glass-panel-bright p-3 rounded-xl text-center"
          animate={{ borderColor: totalAllowed > 0 ? '#10B98144' : '#334155' }}
        >
          <div className="text-2xl font-black text-emerald-400">{totalAllowed.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-0.5">Total Allowed</div>
        </motion.div>
        <motion.div
          className="glass-panel-bright p-3 rounded-xl text-center"
          animate={{ borderColor: totalBlocked > 0 ? '#EF444444' : '#334155' }}
        >
          <div className="text-2xl font-black text-red-400">{totalBlocked.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-0.5">Total Blocked</div>
        </motion.div>
        <div className="glass-panel-bright p-3 rounded-xl text-center">
          <div
            className="text-2xl font-black"
            style={{ color: successRate > 70 ? '#10B981' : successRate > 40 ? '#F59E0B' : '#EF4444' }}
          >
            {successRate}%
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Success Rate</div>
        </div>
      </div>

      {/* Area chart */}
      <div style={{ height: '200px' }}>
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            <span>Waiting for traffic data...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="allowedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="blockedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="allowed"
                name="Allowed"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#allowedGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#10B981' }}
              />
              <Area
                type="monotone"
                dataKey="blocked"
                name="Blocked"
                stroke="#EF4444"
                strokeWidth={2}
                fill="url(#blockedGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#EF4444' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
