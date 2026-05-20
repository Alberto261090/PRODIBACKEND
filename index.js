// =============================================================
// PRODI - Backend Node + Express + Mongoose (MongoDB Atlas)
// =============================================================
// Endpoints:
//   GET    /api/health             estado del servicio
//   GET    /api/status             estado detallado (mongo, env, modelos)
//
//   POST   /api/auth/login         login (email + password)
//   GET    /api/auth/me            usuario actual (Bearer token)
//   POST   /api/auth/logout        logout
//
//   GET    /api/users              lista usuarios (?q=)
//   GET    /api/users/:id          detalle
//   POST   /api/users              alta
//   PUT    /api/users/:id          cambio
//   DELETE /api/users/:id          baja
//
//   GET    /api/evaluaciones       lista
//   GET    /api/evaluaciones/:id   detalle
//   POST   /api/evaluaciones       alta (step 7 + 8 + meta)
//   PUT    /api/evaluaciones/:id   cambio
//   DELETE /api/evaluaciones/:id   baja
// =============================================================

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import { connectDB, isConnected, connectionStatus, debugUri } from './db.js';
import usersRouter      from './routes/users.js';
import authRouter        from './routes/auth.js';
import evaluacionesRouter from './routes/evaluaciones.js';
import contactsRouter    from './routes/contacts.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// En producción se lee ALLOWED_ORIGIN del .env (ej: https://tudominio.com)
// En desarrollo se permite todo.
const corsOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

/* ============================================================
   HEALTH & STATUS
   ============================================================ */
app.get('/api/health', (_, res) => {
  res.json({
    ok: true,
    service: 'prodi-backend',
    mongo: connectionStatus(),
    connected: isConnected(),
    timestamp: new Date().toISOString(),
  });
});

// Diagnostico mas completo
app.get('/api/status', (_, res) => {
  const collections = Object.keys(mongoose.models).sort();
  res.json({
    ok: true,
    mongo: {
      status: connectionStatus(),
      connected: isConnected(),
      uri: debugUri(),
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null,
      models: collections,
    },
    env: {
      hasMongoUri: !!process.env.MONGO_URI,
      hasJwtSecret: !!process.env.JWT_SECRET,
      port: PORT,
      node: process.version,
    },
    timestamp: new Date().toISOString(),
  });
});

/* ============================================================
   RUTAS
   ============================================================ */
app.use('/api/auth',        authRouter);
app.use('/api/users',       usersRouter);
app.use('/api/evaluaciones', evaluacionesRouter);
app.use('/api/contacts',    contactsRouter);

// 404 para rutas /api desconocidas
app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, error: `Ruta ${req.method} ${req.path} no encontrada` });
});

// Error handler global
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ ok: false, error: err.message || 'Error interno del servidor' });
});

/* ============================================================
   BOOTSTRAP
   ============================================================ */
async function bootstrap() {
  console.log('');
  console.log('  ============================================');
  console.log('     PRODI Backend - Iniciando...');
  console.log('  ============================================');

  await connectDB();

  app.listen(PORT, () => {
    console.log('');
    console.log(`  Server: http://localhost:${PORT}`);
    console.log(`  Mongo:  ${connectionStatus()} ${isConnected() ? '(OK)' : '(no listo)'}`);
    console.log('');
    console.log('  Endpoints:');
    console.log(`    GET  /api/health`);
    console.log(`    GET  /api/status`);
    console.log(`    POST /api/auth/login`);
    console.log(`    GET  /api/users        POST /api/users`);
    console.log(`    GET  /api/evaluaciones POST /api/evaluaciones`);
    console.log('');
  });

  // Reintento si la primera conexion fallo
  if (!isConnected()) {
    const retryInterval = setInterval(async () => {
      if (isConnected()) {
        clearInterval(retryInterval);
        return;
      }
      console.log('  [DB] Reintentando conexion...');
      const conn = await connectDB();
      if (conn) {
        console.log('  [DB] Reconexion exitosa.');
        clearInterval(retryInterval);
      }
    }, 30000);
  }
}

// Cierre limpio
async function shutdown() {
  console.log('\n  Cerrando servidor...');
  try { await mongoose.disconnect(); } catch {}
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ── Evitar que errores no capturados cierren el proceso ──────────────────────
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] El servidor CONTINÚA ejecutándose.');
  console.error('  name   :', err?.name);
  console.error('  message:', err?.message);
  console.error('  stack  :', err?.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection] Promesa rechazada sin capturar:');
  console.error(' ', reason?.message ?? reason);
});

bootstrap();
