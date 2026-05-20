# Backend PRODI (Node + Express + MongoDB)

API REST para el módulo de **Usuarios** del sitio Home.

## Estructura

```
apps/backend/
├── index.js              # bootstrap del servidor
├── db.js                 # conexión a MongoDB
├── routes/
│   └── users.js          # CRUD de usuarios
├── models/
│   └── User.js           # schema Mongoose
├── .env.example          # plantilla de variables de entorno
└── package.json
```

## Instalación

```bash
cd apps/backend
npm install
cp .env.example .env
# Edita .env y completa MONGO_HOST, MONGO_USER, MONGO_PASS, MONGO_DB
npm run dev
```

Por defecto corre en **http://localhost:4000**.

## Datos pendientes de configurar (.env)

| Variable | Valor pendiente | Ejemplo |
|---|---|---|
| `MONGO_HOST` | dirección del servidor Mongo | `localhost` o `cluster0.abcde.mongodb.net` |
| `MONGO_PORT` | puerto (opcional, 27017 default) | `27017` |
| `MONGO_USER` | usuario con permisos sobre la BD | `prodi_admin` |
| `MONGO_PASS` | contraseña del usuario | `********` |
| `MONGO_DB` | nombre de la BD | `prodi` |

Si usas **MongoDB Atlas** o ya tienes la URI completa, define únicamente `MONGO_URI` y los otros se ignoran.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del servicio + conexión Mongo |
| GET | `/api/users` | Lista usuarios. Acepta `?q=` para búsqueda |
| GET | `/api/users/:id` | Detalle de un usuario |
| POST | `/api/users` | Alta de usuario |
| PUT | `/api/users/:id` | Cambio / actualización (parcial) |
| DELETE | `/api/users/:id` | Baja |

### Schema de usuario

```json
{
  "nombre": "Juan Carlos",
  "apellidos": "Correa López",
  "email": "juan.correa@prodi.mx",
  "contrasena": "********",
  "estatus": true
}
```

La **contraseña se almacena hasheada** con bcrypt (costo configurable con `BCRYPT_ROUNDS`, default 10). Las respuestas nunca la incluyen.

### Respuestas

Todas siguen el formato:

```json
{ "ok": true,  "user": { ... } }
{ "ok": true,  "items": [ ... ] }
{ "ok": false, "error": "Mensaje" }
```

Status codes: `200`, `201` (alta), `400` (validación), `404` (no encontrado), `409` (email duplicado), `503` (Mongo desconectado), `500` (error interno).

## Pruebas rápidas con curl

```bash
# Alta
curl -X POST http://localhost:4000/api/users \
  -H 'Content-Type: application/json' \
  -d '{"nombre":"Ada","apellidos":"Lovelace","email":"ada@prodi.mx","contrasena":"secreta123"}'

# Lista
curl http://localhost:4000/api/users

# Cambio
curl -X PUT http://localhost:4000/api/users/<ID> \
  -H 'Content-Type: application/json' \
  -d '{"estatus":false}'

# Baja
curl -X DELETE http://localhost:4000/api/users/<ID>
```

## Frontend

El frontend (`apps/web`) consume estas rutas a través del proxy de Vite, que reenvía cualquier `/api/*` al backend en el puerto 4000. La integración está en `apps/web/src/lib/usersApi.js`.
