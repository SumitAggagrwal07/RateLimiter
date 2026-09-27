// All shared TypeScript types for the Rate Limiter dashboard

export type Algorithm = 'token_bucket' | 'leaking_bucket' | 'fixed_window' | 'sliding_window';

export interface RateLimiterConfig {
  algorithm: Algorithm;
  capacity: number;
  refillRate: number;
  leakRate: number;
  limit: number;
  windowMs: number;
}

export interface BucketState {
  // Token bucket
  tokens?: number;
  fillPercent?: number;
  // Leaking bucket
  queueSize?: number;
  queuePercent?: number;
  leakRate?: number;
  // Fixed window
  count?: number;
  windowMs?: number;
  windowStart?: number;
  windowEnd?: number;
  timeRemainingMs?: number;
  // Sliding window
  logEntries?: LogEntry[];
  // Shared
  capacity?: number;
  limit?: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  age: number;
}

export interface RequestEvent {
  requestId: string;
  clientIp: string;
  endpoint: string;
  method: string;
  algorithm: Algorithm;
  allowed: boolean;
  remaining: number;
  limit: number;
  latencyMs: number;
  timestamp: string;
  state: BucketState;
}

export interface MetricsSnapshot {
  allowed: number;
  blocked: number;
  total: number;
  timestamp: number;
  connections: number;
}

export interface ChartDataPoint {
  time: string;
  timestamp: number;
  allowed: number;
  blocked: number;
  total: number;
}

export interface RequestLogEntry {
  _id?: string;
  requestId: string;
  clientIp: string;
  endpoint: string;
  method: string;
  statusCode: number;
  algorithm: Algorithm;
  latencyMs: number;
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt?: string;
  timestamp: string;
}

export interface SimulatorConfig {
  rps: number;
  burstMultiplier: number;
  concurrentClients: number;
  isBursting: boolean;
}
