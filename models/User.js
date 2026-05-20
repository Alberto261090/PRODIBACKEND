import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    nombre:    { type: String, required: true, trim: true, maxlength: 80 },
    apellidos: { type: String, required: true, trim: true, maxlength: 120 },
    email:     {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido'],
    },
    // El hash NO se devuelve por defecto. Para obtenerlo hay que
    // usar `.select('+contrasena')` explícitamente.
    contrasena: { type: String, required: true, select: false },
    estatus:    { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Cuando se serializa a JSON: usar `id` en lugar de `_id`, ocultar `__v`
// y nunca exponer el hash.
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    delete ret.contrasena;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
