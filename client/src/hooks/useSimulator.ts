import { useRef, useCallback, useState } from 'react';
import type { SimulatorConfig } from '../types';

export function useSimulator() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [simConfig, setSimConfig] = useState<SimulatorConfig>({
    rps: 3,
    burstMultiplier: 5,
    concurrentClients: 1,
    isBursting: false,
  });

  const sendRequest = useCallback(async (clientId?: string) => {
    try {
      const ip = clientId ? `192.168.1.${clientId}` : undefined;
      const headers: Record<string, string> = {};
      if (ip) headers['X-Forwarded-For'] = ip;

      await fetch('/api/test', { headers });
    } catch (_) {
      // Network errors are expected when server is under load
    }
  }, []);

  const start = useCallback((cfg: SimulatorConfig) => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const effectiveRps = cfg.isBursting ? cfg.rps * cfg.burstMultiplier : cfg.rps;
    const intervalMs = Math.max(50, Math.floor(1000 / effectiveRps));

    setIsRunning(true);

    let tick = 0;
    intervalRef.current = setInterval(() => {
      tick++;
      // Send requests for each concurrent client
      for (let i = 1; i <= cfg.concurrentClients; i++) {
        sendRequest(String(i));
      }
    }, intervalMs);
  }, [sendRequest]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const triggerBurst = useCallback((cfg: SimulatorConfig) => {
    // Fire a rapid burst of requests
    const burstCount = cfg.rps * cfg.burstMultiplier;
    const promises = [];
    for (let i = 0; i < burstCount; i++) {
      const clientId = String(Math.floor(Math.random() * cfg.concurrentClients) + 1);
      promises.push(
        new Promise<void>((resolve) => {
          setTimeout(() => {
            sendRequest(clientId).then(resolve).catch(resolve);
          }, i * 50)
        })
      );
    }
    Promise.all(promises).catch(() => {});
  }, [sendRequest]);

  const updateSimConfig = useCallback((updates: Partial<SimulatorConfig>) => {
    setSimConfig((prev) => {
      const next = { ...prev, ...updates };
      return next;
    });
  }, []);

  return {
    isRunning,
    simConfig,
    start,
    stop,
    triggerBurst,
    updateSimConfig,
  };
}
