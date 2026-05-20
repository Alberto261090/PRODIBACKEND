import { Router } from 'express';
import Evaluacion from '../models/Evaluacion.js';
import { isConnected } from '../db.js';

const router = Router();

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
   GET /api/evaluaciones   →  lista
   ============================================================= */
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q
      ? {
          $or: [
            { 'projectData.empresaName': new RegExp(q, 'i') },
            { 'projectData.contactName': new RegExp(q, 'i') },
            { 'projectData.email': new RegExp(q, 'i') },
            { industry: new RegExp(q, 'i') },
          ],
        }
      : {};
    const items = await Evaluacion.find(filter).sort({ createdAt: -1 });
    res.json({ ok: true, items });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* =============================================================
   GET /api/evaluaciones/:id
   ============================================================= */
router.get('/:id', async (req, res) => {
  try {
    const item = await Evaluacion.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: 'No encontrado' });
    res.json({ ok: true, evaluacion: item });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

/* =============================================================
   POST /api/evaluaciones   →  alta
   Body: estructura completa del diagnóstico (step 7 + 8 + meta)
   ============================================================= */
router.post('/', async (req, res) => {
  try {
    const created = await Evaluacion.create(req.body || {});
    res.status(201).json({ ok: true, evaluacion: created });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

/* =============================================================
   PUT /api/evaluaciones/:id   →  cambio
   ============================================================= */
router.put('/:id', async (req, res) => {
  try {
    const updated = await Evaluacion.findByIdAndUpdate(req.params.id, req.body || {}, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ ok: false, error: 'No encontrado' });
    res.json({ ok: true, evaluacion: updated });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

/* =============================================================
   DELETE /api/evaluaciones/:id
   ============================================================= */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Evaluacion.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, error: 'No encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

export default router;
