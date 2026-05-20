import mongoose from 'mongoose';

/**
 * Evaluacion (diagnóstico de proyecto)
 * --------------------------------------------------------------------------
 * Almacena el resultado del flujo de diagnóstico.
 *
 *  Step 7  → projectData (investment, targetDate, location, area,
 *            empresaName, contactName, perfilName, email, phone, noInfo)
 *  Step 8  → riskAwareness (7 áreas con estatus
 *            'Revisado' | 'Parcialmente' | 'No revisado')
 *
 *  Meta    → maturityScore, riskLevel (calculados en el frontend)
 *            + industry, projectType, painPoints, etc. (snapshot completo)
 * --------------------------------------------------------------------------
 */

const projectDataSchema = new mongoose.Schema(
  {
    investment:   { type: String, default: '' },
    targetDate:   { type: String, default: '' },     // YYYY-MM-DD
    location:     { type: String, default: '' },
    area:         { type: String, default: '' },     // en m²
    empresaName:  { type: String, default: '' },
    contactName:  { type: String, default: '' },
    perfilName:   { type: String, default: '' },
    email:        { type: String, default: '' },
    phone:        { type: String, default: '' },
    noInfo:       { type: Boolean, default: false },
  },
  { _id: false },
);

const evaluacionSchema = new mongoose.Schema(
  {
    // ============= Step 7 =============
    projectData: { type: projectDataSchema, default: () => ({}) },

    // ============= Step 8 =============
    // Mapa flexible: cada clave es el nombre del área, el valor es el estatus.
    // Se guarda como objeto libre (Mongoose Mixed) porque las áreas pueden cambiar.
    riskAwareness: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ============= Otros pasos del diagnóstico =============
    industry:     { type: String, default: '' },
    projectType:  { type: String, default: '' },        // ya viene unido por comas
    projectStage: { type: [String], default: [] },
    painPoints:   { type: [String], default: [] },
    desiredScope: { type: [String], default: [] },
    nextStep:     { type: String, default: '' },

    // ============= Meta calculada =============
    maturityScore: { type: Number, default: 0 },     // 0-100
    riskLevel:     { type: String, enum: ['HIGH', 'MEDIUM', 'LOW', 'High', 'Medium', 'Low', ''], default: '' },
  },
  { timestamps: true },
);

// Devuelve `id` en lugar de `_id` y elimina __v
evaluacionSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    return ret;
  },
});

export default mongoose.model('Evaluacion', evaluacionSchema);
