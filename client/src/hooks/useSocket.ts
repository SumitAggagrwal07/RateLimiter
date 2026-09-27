import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  RequestEvent,
  MetricsSnapshot,
  ChartDataPoint,
  RateLimiterConfig,
  BucketState,
  Algorithm,
} from '../types';

const SOCKET_URL = 'http://localhost:5000';
const MAX_EVENTS = 100;
const MAX_CHART_POINTS = 60;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [recentEvents, setRecentEvents] = useState<RequestEvent[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [currentState, setCurrentState] = useState<BucketState>({});
  const [config, setConfig] = useState<RateLimiterConfig>({
    algorithm: 'token_bucket',
    capacity: 10,
    refillRate: 2,
    leakRate: 2,
    limit: 10,
    windowMs: 10000,
  });
  const [totalAllowed, setTotalAllowed] = useState(0);
  const [totalBlocked, setTotalBlocked] = useState(0);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('get_config');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('config_update', (newConfig: RateLimiterConfig) => {
      setConfig(newConfig);
    });

    socket.on('request_processed', (event: RequestEvent) => {
      setRecentEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
      setTotalAllowed((n) => n + 1);
      if (event.state) setCurrentState(event.state);
    });

    socket.on('request_blocked', (event: RequestEvent) => {
      setRecentEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
      setTotalBlocked((n) => n + 1);
      if (event.state) setCurrentState(event.state);
    });

    socket.on('bucket_state_changed', ({ state }: { algorithm: Algorithm; state: BucketState }) => {
      if (state) setCurrentState(state);
    });

    socket.on('metrics_snapshot', (snapshot: MetricsSnapshot) => {
      const now = new Date(snapshot.timestamp);
      const timeLabel = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      setChartData((prev) => {
        const next = [
          ...prev,
          {
            time: timeLabel,
            timestamp: snapshot.timestamp,
            allowed: snapshot.allowed,
            blocked: snapshot.blocked,
            total: snapshot.total,
          },
        ].slice(-MAX_CHART_POINTS);
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const updateConfig = useCallback((updates: Partial<RateLimiterConfig>) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('update_config', updates);
    } else {
      // Fallback to REST
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).catch(console.error);
    }
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearEvents = useCallback(() => {
    setRecentEvents([]);
    setTotalAllowed(0);
    setTotalBlocked(0);
    setChartData([]);
  }, []);

  return {
    isConnected,
    recentEvents,
    chartData,
    currentState,
    config,
    totalAllowed,
    totalBlocked,
    updateConfig,
    clearEvents,
    socket: socketRef.current,
  };
}
