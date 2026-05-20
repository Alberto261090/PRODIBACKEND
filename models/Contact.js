import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    nombre:        { type: String, required: true, trim: true },
    empresa:       { type: String, required: true, trim: true },
    email:         { type: String, required: true, trim: true, lowercase: true },
    telefono:      { type: String, required: true, trim: true },
    sector:        { type: String, required: true, trim: true },
    tipo_proyecto: { type: String, required: true, trim: true },
    mensaje:       { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

export default mongoose.model('Contact', contactSchema);
