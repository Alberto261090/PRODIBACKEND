// =============================================================
// Script para crear un usuario administrador inicial.
// Ejecutar con: npm run seed
// =============================================================
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

import { connectDB, isConnected } from '../db.js';
import User from '../models/User.js';

dotenv.config();

const SEED_USER = {
  nombre:     'Administrador',
  apellidos:  'PRODI',
  email:      'admin@prodi.mx',
  contrasena: 'admin1234',     // sera hasheada
  estatus:    true,
};

async function run() {
  console.log('\n  [seed] Conectando a MongoDB...');
  await connectDB();

  if (!isConnected()) {
    console.error('  [seed] No se pudo conectar a Mongo. Abortando.');
    process.exit(1);
  }

  try {
    const exists = await User.findOne({ email: SEED_USER.email });
    if (exists) {
      console.log(`  [seed] Ya existe: ${SEED_USER.email}`);
      console.log(`  [seed] Para resetear su contrasena, eliminalo desde Atlas o borra la coleccion.`);
    } else {
      const hash = await bcrypt.hash(SEED_USER.contrasena, 10);
      const created = await User.create({ ...SEED_USER, contrasena: hash });
      console.log('');
      console.log('  [seed] Usuario admin creado.');
      console.log(`         Email:      ${created.email}`);
      console.log(`         Contrasena: ${SEED_USER.contrasena}`);
      console.log(`         ID:         ${created._id}`);
    }

    const count = await User.countDocuments();
    console.log(`\n  [seed] Total usuarios en BD: ${count}`);
  } catch (err) {
    console.error('  [seed] ERROR:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
