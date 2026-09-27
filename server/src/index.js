import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { initRedis } from './config/redis.js';
import { connectMongoDB } from './config/database.js';
import { createRateLimiter, setIo, updateConfig, getConfig } from './middleware/rateLimiter.js';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check (no rate limiting)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    config: getConfig(),
  });
});

// Apply rate limiter to test routes
const rateLimiter = createRateLimiter();
app.use('/api/test', rateLimiter);

// API routes
app.use('/api', apiRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Send current config on connect
  socket.emit('config_update', getConfig());

  // Dynamic config update via WebSocket
  socket.on('update_config', (newConfig) => {
    console.log('📡 Config update via socket:', newConfig);
    updateConfig(newConfig);
    // Broadcast updated config to all clients
    io.emit('config_update', getConfig());
  });

  // Client requests current config
  socket.on('get_config', () => {
    socket.emit('config_update', getConfig());
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id} — ${reason}`);
  });

  socket.on('error', (err) => {
    console.error(`Socket error from ${socket.id}:`, err);
  });
});

// Inject io into middleware
setIo(io);

// Metrics broadcast interval — emit aggregate stats every 2 seconds
let requestCounts = { allowed: 0, blocked: 0, total: 0 };
let metricsHistory = [];

// Track counts from socket events internally
io.on('connection', () => {});

// Broadcast periodic metrics
setInterval(() => {
  const snapshot = {
    ...requestCounts,
    timestamp: Date.now(),
    connections: io.engine.clientsCount,
  };
  metricsHistory.push(snapshot);
  if (metricsHistory.length > 300) metricsHistory.shift();

  io.emit('metrics_snapshot', snapshot);
  requestCounts = { allowed: 0, blocked: 0, total: 0 };
}, 1000);

// Intercept socket events to update internal counts
const originalEmit = io.emit.bind(io);
io.emit = function(event, ...args) {
  if (event === 'request_processed') requestCounts.allowed++;
  if (event === 'request_blocked') requestCounts.blocked++;
  if (event === 'request_processed' || event === 'request_blocked') requestCounts.total++;
  return originalEmit(event, ...args);
};

async function bootstrap() {
  // Initialize connections (graceful degradation if unavailable)
  await Promise.allSettled([
    initRedis(),
    connectMongoDB(),
  ]);

  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    console.log(`\n🚀 Rate Limiter Engine running on http://localhost:${PORT}`);
    console.log(`📡 Socket.io server active`);
    console.log(`🔧 Algorithm: ${getConfig().algorithm}`);
    console.log(`\nAvailable endpoints:`);
    console.log(`  GET  /health`);
    console.log(`  GET  /api/test       — Rate-limited test endpoint`);
    console.log(`  GET  /api/config     — Get current config`);
    console.log(`  POST /api/config     — Update config`);
    console.log(`  GET  /api/logs       — Request history (MongoDB)`);
    console.log(`  GET  /api/stats      — Aggregate statistics`);
  });
}

bootstrap().catch(console.error);
