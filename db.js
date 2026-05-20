import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Fix: Node.js v18+ (y especialmente v22/v24) cambia el comportamiento
 * del resolver DNS del sistema. En Windows, el router/ISP a veces rechaza
 * las queries SRV que usa mongodb+srv://, resultando en:
 *   "querySrv ECONNREFUSED _mongodb._tcp.<cluster>.mongodb.net"
 *
 * Solución: forzar DNS de Google (8.8.8.8) y Cloudflare (1.1.1.1) que
 * resuelven SRV correctamente sin importar la configuración del sistema.
 */
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1']);

/**
 * Conexion a MongoDB (Mongoose) con diagnostico claro.
 *
 * Configuracion en apps/backend/.env:
 *   - MONGO_URI=mongodb+srv://user:pass@cluster.../db?...   (opcion A, recomendado Atlas)
 *   - O bien:
 *       MONGO_HOST=cluster.mongodb.net
 *       MONGO_USER=...
 *       MONGO_PASS=...
 *       MONGO_DB=Prodi
 *       MONGO_SRV=true       (true = mongodb+srv,  false = mongodb)
 */
function buildUri() {
  const {
    MONGO_URI,
    MONGO_HOST,
    MONGO_PORT = '27017',
    MONGO_USER,
    MONGO_PASS,
    MONGO_DB = 'Prodi',
    MONGO_SRV = 'true',
  } = process.env;

  if (MONGO_URI) return MONGO_URI;
  if (!MONGO_HOST) return null;

  const user = encodeURIComponent(MONGO_USER || '');
  const pass = encodeURIComponent(MONGO_PASS || '');
  const auth = user && pass ? `${user}:${pass}@` : '';

  if (String(MONGO_SRV).toLowerCase() === 'true') {
    return `mongodb+srv://${auth}${MONGO_HOST}/${MONGO_DB}?retryWrites=true&w=majority`;
  }
  return `mongodb://${auth}${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;
}

const maskUri = (uri) => (uri ? uri.replace(/\/\/([^:]+):[^@]+@/, '//$1:***@') : '(sin uri)');

// Listeners globales (una sola vez por proceso)
mongoose.connection.on('connected',    () => console.log('  [Mongoose] connected (readyState=1)'));
mongoose.connection.on('disconnected', () => console.warn('  [Mongoose] disconnected'));
mongoose.connection.on('reconnected',  () => console.log('  [Mongoose] reconnected'));
mongoose.connection.on('error',        (e) => console.error('  [Mongoose] error:', e.message));

/**
 * Conecta a MongoDB. Devuelve la conexion en exito o null en error.
 * Lanza el error original adentro para que el caller decida que hacer.
 */
export async function connectDB() {
  const uri = buildUri();

  if (!uri) {
    console.warn('');
    console.warn('  [DB] Variables de conexion NO configuradas.');
    console.warn('       Edita apps/backend/.env y define MONGO_URI');
    console.warn('       o MONGO_HOST + MONGO_USER + MONGO_PASS.');
    console.warn('');
    return null;
  }

  console.log(`  [DB] Conectando a: ${maskUri(uri)}`);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 45000,
      // No forzar family:4 en Node.js v22+ — el DNS override de arriba
      // ya garantiza resolución correcta sin limitar a IPv4 en el socket.
    });
    return mongoose.connection;
  } catch (err) {
    console.error('');
    console.error('  [DB] ERROR al conectar:', err.message);
    if (/querySrv/i.test(err.message)) {
      console.error('       -> DNS SRV fallando. Verifica tu conexion a Internet.');
      console.error('          Si el error persiste, el cluster puede estar PAUSADO en Atlas.');
    } else if (/ETIMEOUT|ENOTFOUND/i.test(err.message)) {
      console.error('       -> Red/DNS. Revisa tu conexion a Internet o Atlas Network Access.');
    } else if (/authentication failed|bad auth/i.test(err.message)) {
      console.error('       -> Auth. Usuario/contrasena incorrectos.');
    } else if (/SSL|TLS/i.test(err.message)) {
      console.error('       -> TLS. Posible firewall/antivirus bloqueando.');
    }
    console.error('');
    return null;
  }
}

/** isConnected real basado en readyState de mongoose. */
export function isConnected() {
  return mongoose.connection.readyState === 1;
}

/** Estado textual del readyState. */
export function connectionStatus() {
  const map = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return map[mongoose.connection.readyState] || 'unknown';
}

/** Devuelve la URI (oculta password) para logs. */
export function debugUri() {
  return maskUri(buildUri());
}
