require('dotenv').config();

const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const mongoose   = require('mongoose');
const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');

const logsRouter   = require('./routes/logs');
const alertsRouter = require('./routes/alerts');
const testsRouter  = require('./routes/tests');
const authRouter   = require('./routes/auth');
const authMiddleware = require('./middleware/auth');

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
  pingTimeout:  60000,
  pingInterval: 25000,
});

// Authenticate socket connections via JWT
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  console.log(`[WS] ✅ Connected: ${socket.user?.username}`);
  socket.on('disconnect', (reason) =>
    console.log(`[WS] ❌ Disconnected: ${socket.user?.username} (${reason})`));
});

app.set('io', io);

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));

// Global rate limiter — 300 req/min per IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  message: { success: false, message: 'Too many requests from this IP — try again in a minute' },
}));

app.use(express.json({ limit: '1mb' }));

// Request logger
app.use((req, _res, next) => {
  if (!isProd || req.path !== '/health')
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',   authRouter);
app.use('/api/logs',   authMiddleware, logsRouter);
app.use('/api/alerts', authMiddleware, alertsRouter);
app.use('/api/tests',  authMiddleware, testsRouter);

app.get('/health', (_req, res) =>
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  })
);

// 404 handler
app.use((_req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' })
);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Error]', err.message);
  if (isProd) return res.status(500).json({ success: false, message: 'Internal server error' });
  return res.status(500).json({ success: false, message: err.message, stack: err.stack });
});

// ── MongoDB + server start ────────────────────────────────────────────────────
async function start() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/api_security';

  mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected — retrying…'));
  mongoose.connection.on('reconnected',  () => console.log('✅ MongoDB reconnected'));

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB connected`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('   Set MONGO_URI in backend/.env and make sure MongoDB is running');
    process.exit(1);
  }

  // Seed default admin user on first run
  const User = require('./models/User');
  const adminExists = await User.findOne({ role: 'admin' });
  if (!adminExists) {
    const pwd = process.env.ADMIN_PASSWORD || 'admin123';
    await User.create({ username: 'admin', password: pwd, role: 'admin' });
    console.log(`👤 Default admin created → username: admin | password: ${pwd}`);
    if (pwd === 'admin123')
      console.warn('   ⚠️  Using default password — change ADMIN_PASSWORD in .env for production!');
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Socket.IO ready`);
    console.log(`🌍 Allowed origins: ${allowedOrigins.join(', ')}\n`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received — shutting down gracefully');
  await mongoose.connection.close();
  server.close(() => process.exit(0));
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  server.close(() => process.exit(0));
});

start();
module.exports = { app, server };
