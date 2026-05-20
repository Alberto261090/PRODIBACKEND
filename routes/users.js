import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { isConnected } from '../db.js';

const router = Router();

// Middleware: si Mongo no está conectado, responde 503 con mensaje claro.
router.use((req, res, next) => {
  if (!isConnected()) {
    return res.status(503).json({
      ok: false,
      error: 'MongoDB no está conectado. Revisa apps/backend/.env',
    });
  }
  next();
});

const ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

/* =============================================================
   GET /api/users   →  Lista (con búsqueda opcional ?q=)
   ============================================================= */
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q
      ? {
          $or: [
            { nombre: new RegExp(q, 'i') },
            { apellidos: new RegExp(q, 'i') },
            { email: new RegExp(q, 'i') },
          ],
        }
      : {};
    const items = await User.find(filter).sort({ createdAt: -1 });
    res.json({ ok: true, items });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* =============================================================
   GET /api/users/:id   →  Detalle
   ============================================================= */
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    res.json({ ok: true, user });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

/* =============================================================
   POST /api/users   →  Alta
   Body: { nombre, apellidos, email, contrasena, estatus }
   ============================================================= */
router.post('/', async (req, res) => {
  try {
    const { nombre, apellidos, email, contrasena, estatus } = req.body || {};

    if (!nombre || !apellidos || !email || !contrasena) {
      return res.status(400).json({
        ok: false,
        error: 'Campos requeridos: nombre, apellidos, email, contrasena',
      });
    }

    const hash = await bcrypt.hash(String(contrasena), ROUNDS);
    const created = await User.create({
      nombre:    String(nombre).trim(),
      apellidos: String(apellidos).trim(),
      email:     String(email).trim().toLowerCase(),
      contrasena: hash,
      estatus: estatus !== undefined ? Boolean(estatus) : true,
    });

    // Devolver solo los campos seguros (sin contrasena)
    const userPlain = created.toObject({ virtuals: true });
    delete userPlain.contrasena;
    delete userPlain.__v;
    userPlain.id = userPlain._id?.toString();
    delete userPlain._id;

    return res.status(201).json({ ok: true, user: userPlain });

  } catch (err) {
    // Log detallado para diagnóstico en consola del backend
    console.error('[POST /api/users]', {
      name:    err?.name,
      code:    err?.code,
      message: err?.message,
    });

    // Email duplicado (índice único de MongoDB)
    if (err?.code === 11000) {
      return res.status(409).json({ ok: false, error: 'El email ya está registrado' });
    }

    // Errores de validación de Mongoose
    if (err?.name === 'ValidationError') {
      const msgs = Object.values(err.errors || {}).map((e) => e.message).join(', ');
      return res.status(400).json({ ok: false, error: msgs || err.message });
    }

    return res.status(400).json({ ok: false, error: err?.message || 'Error al crear el usuario' });
  }
});

/* =============================================================
   PUT /api/users/:id   →  Cambio / actualización
   Body parcial: cualquier subconjunto de campos
   Si viene `contrasena`, se re-hashea.
   ============================================================= */
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates._id;
    delete updates.__v;

    if (updates.contrasena) {
      updates.contrasena = await bcrypt.hash(String(updates.contrasena), ROUNDS);
    } else {
      delete updates.contrasena; // no tocar si no se mandó
    }

    const updated = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });

    const userPlain = updated.toObject({ virtuals: true });
    delete userPlain.contrasena;
    delete userPlain.__v;
    userPlain.id = userPlain._id?.toString();
    delete userPlain._id;

    return res.json({ ok: true, user: userPlain });
  } catch (err) {
    console.error('[PUT /api/users/:id]', {
      name: err?.name,
      code: err?.code,
      message: err?.message,
    });
    if (err?.code === 11000) {
      return res.status(409).json({ ok: false, error: 'El email ya está registrado' });
    }
    if (err?.name === 'ValidationError') {
      const msgs = Object.values(err.errors || {}).map((e) => e.message).join(', ');
      return res.status(400).json({ ok: false, error: msgs || err.message });
    }
    return res.status(400).json({ ok: false, error: err?.message || 'Error al actualizar el usuario' });
  }
});

/* =============================================================
   DELETE /api/users/:id   →  Baja
   ============================================================= */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

export default router;
