import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isConnected } from '../db.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'a1s2d3-f4g5h6-j7k8l9';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '10m';

router.use((req, res, next) => {
  if (!isConnected()) {
    return res.status(503).json({
      ok: false,
      error: 'MongoDB no está conectado. Revisa apps/backend/.env',
    });
  }
  next();
});

/* =============================================================
   POST /api/auth/login
   Body: { email, password }
   Devuelve: { ok, token, user }
   ============================================================= */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email y contraseña son requeridos' });
    }

    // Buscar usuario incluyendo el campo `contrasena` (que está oculto por default)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+contrasena');
    if (!user) {
      // Mismo mensaje para email/password incorrectos (evita user enumeration)
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
    }

    if (!user.estatus) {
      return res.status(403).json({ ok: false, error: 'Usuario inactivo. Contacta al administrador.' });
    }

    const match = await bcrypt.compare(password, user.contrasena);
    if (!match) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
    }

    // Generar JWT con datos básicos
    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES },
    );

    res.json({
      ok: true,
      token,                          // ← el cliente lo necesita para sesiones
      user: {
        id: user._id.toString(),
        nombre: user.nombre,
        apellidos: user.apellidos,
        email: user.email,
        estatus: user.estatus,
      },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ ok: false, error: 'Error al iniciar sesión' });
  }
});

/* =============================================================
   GET /api/auth/me   (verifica token y devuelve usuario)
   Header: Authorization: Bearer <token>
   ============================================================= */
router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ ok: false, error: 'Sin token' });

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ ok: false, error: 'Usuario no encontrado' });

    res.json({ ok: true, user });
  } catch (err) {
    res.status(401).json({ ok: false, error: 'Token inválido o expirado' });
  }
});

/* =============================================================
   POST /api/auth/logout
   El JWT es stateless, así que solo respondemos OK.
   El cliente borra el token de su lado.
   ============================================================= */
router.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

/* =============================================================
   Middleware reutilizable para proteger rutas privadas
   ============================================================= */
export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: 'No autenticado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ ok: false, error: 'Token inválido o expirado' });
  }
}

export default router;
