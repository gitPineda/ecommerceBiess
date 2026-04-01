# Ecommerce Biess Monorepo

Monorepo listo para nube con dos workspaces:

- `mobile/`: app movil Expo / React Native
- `backend/`: API NestJS preparada para PostgreSQL con Prisma

La app movil y el backend se desarrollan juntos, pero se despliegan por separado:

- la app se publica en Google Play
- el backend se sube a un hosting cloud
- PostgreSQL vive como servicio aparte o gestionado

## Requisitos

- Node.js 20.19 o superior
- npm 10 o superior
- Docker opcional para PostgreSQL local

## Estructura

- `mobile/`: app Expo, assets, Android nativo y UI actual
- `backend/`: API NestJS, Prisma y modulos base
- `docker-compose.yml`: PostgreSQL local para desarrollo

## Instalacion

```bash
npm install
```

## Ejecutar mobile

1. Crea `mobile/.env` usando `mobile/.env.example`

2. Inicia Expo:

```bash
npm run mobile:start
npm run mobile:android
npm run mobile:web
```

Credenciales demo actuales:

- Administrador: `admin` / `Admin123*`
- Cliente: `cliente` / `Cliente123*`

Variables de entorno mobile:

- `EXPO_PUBLIC_DATA_SOURCE=api` para consumir NestJS
- `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api` para emulador iOS/web
- en Android emulador conviene `http://10.0.2.2:4000/api`

## Ejecutar backend

1. Levanta PostgreSQL local si lo necesitas:

```bash
npm run db:up
```

2. Crea `backend/.env` usando `backend/.env.example`

3. Genera Prisma Client:

```bash
npm run backend:prisma:generate
```

4. Crea la migracion inicial en tu base local:

```bash
npm run backend:prisma:migrate -- --name init
```

5. Carga datos demo:

```bash
npm run backend:seed
```

6. Ejecuta la API:

```bash
npm run backend:dev
```

7. Compila para produccion:

```bash
npm run backend:build
npm run backend:start
```

## Backend base

El backend ya incluye:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `GET /api/users/me`
- `GET /api/users/:id`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products` solo admin
- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders`
- esquema Prisma para `User`, `Product`, `Order` y `OrderItem`

Lo que ya hace el backend:

- registro real con hash de clave
- login real con JWT
- consulta de usuario autenticado
- catalogo publico con filtros basicos
- creacion de productos protegida por rol admin
- creacion de pedidos con calculo de subtotal, IVA y descuento de stock
- seed demo con admin, cliente y productos base

## Despliegue

La estructura ya nace lista para separar servicios:

- `mobile/` puede compilarse y publicarse en Google Play
- `backend/` puede desplegarse aparte en Railway, Render, Fly.io, Azure, AWS o GCP
- la app movil solo necesita apuntar a la URL publica del backend
