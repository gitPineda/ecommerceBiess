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

## Estado actual del proyecto

Actualmente el proyecto ya fue migrado a Supabase como base de datos principal.

Eso significa:

- `mobile/` sigue consumiendo `backend/`
- `backend/` sigue corriendo local o en nube
- PostgreSQL local ya no es obligatorio para arrancar el proyecto
- la base local anterior se mantuvo intacta como respaldo

En este momento, la conexion activa de base se controla desde:

- [backend/.env](D:/codex/EcommerceBiess/backend/.env)

La regla practica es:

- si `DATABASE_URL` apunta a Supabase, trabajas sobre Supabase
- si `DATABASE_URL` apunta a `localhost`, trabajas sobre la base local

## Arranque recomendado hoy

Para el estado actual del repo, la forma correcta de arrancar es:

1. `backend` local
2. `mobile` local
3. base de datos en Supabase

No necesitas levantar Docker ni PostgreSQL local para el flujo normal si ya vas a trabajar sobre Supabase.

## Ejecutar mobile

1. Crea `mobile/.env` usando `mobile/.env.example`

2. Inicia Expo:

```bash
npm run mobile:start
npm run mobile:android
npm run mobile:web
```

Credenciales verificadas post-migracion:

- Administrador: `admin` / `Admin123*`
- Vendedor: `maria.vendedora` / `Maria123*`

Nota:

- la credencial demo de `cliente` no debe asumirse como vigente en la base actual migrada
- si necesitas un cliente de prueba fijo, conviene resetear o recrear ese usuario y documentarlo aparte

Variables de entorno mobile:

- `EXPO_PUBLIC_DATA_SOURCE=api` para consumir NestJS
- `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api` para emulador iOS/web
- en Android emulador conviene `http://10.0.2.2:4000/api`

Si pruebas en telefono fisico y el backend corre en tu PC:

- usa la IP local de tu PC, por ejemplo:
  - `EXPO_PUBLIC_API_BASE_URL=http://192.168.100.17:4000/api`
- telefono y PC deben estar en la misma red Wi-Fi
- si Android bloquea HTTP en release, revisa el manifest y network config de `mobile/android`

## Ejecutar backend

### Opcion actual: backend con Supabase

Esta es la opcion correcta para el estado actual del proyecto.

1. Crea `backend/.env` usando `backend/.env.example`

2. Verifica que `DATABASE_URL` apunte a Supabase:

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

3. Genera Prisma Client:

```bash
npm run backend:prisma:generate
```

4. Levanta la API:

```bash
npm run backend:dev
```

5. Compila para produccion:

```bash
npm run backend:build
npm run backend:start
```

### Opcion alternativa: backend con PostgreSQL local

Usa esta opcion solo si quieres volver temporalmente al respaldo local.

1. Cambia `DATABASE_URL` en `backend/.env` para apuntar a local.

2. Levanta PostgreSQL local si lo necesitas:

```bash
npm run db:up
```

3. Levanta la API:

```bash
npm run backend:dev
```

### Variables importantes para backend

Estas variables siguen siendo obligatorias:

- `DATABASE_URL` para PostgreSQL local o productivo
- `PAYPHONE_*` para pagos con tarjeta
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `CLOUDINARY_PRODUCTS_FOLDER=products` para organizar imagenes de catalogo
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`
- `SMTP_FROM_NAME` para el nombre visible del remitente
- `PASSWORD_RESET_CODE_TTL_MINUTES` y `PASSWORD_RESET_MAX_ATTEMPTS`

### Comandos que si debes usar en el entorno actual

```bash
npm run backend:prisma:generate
npm run backend:dev
npm run backend:build
```

### Comandos que no debes correr contra Supabase ya migrado

No ejecutes esto sobre el entorno Supabase actual salvo que sepas exactamente por que lo haces:

```bash
npm run backend:prisma:migrate
npm run backend:seed
```

Motivo:

- la base Supabase actual ya fue cargada con esquema y datos
- `prisma migrate dev` no es el flujo correcto sobre esta base ya existente
- `seed` podria duplicar o alterar datos

### Cuando si usar migrate o seed

Solo en estos casos:

- montas una base local nueva desde cero
- creas un ambiente nuevo de pruebas
- vas a rehacer el esquema deliberadamente

En esos casos:

```bash
npm run backend:prisma:migrate -- --name init
npm run backend:seed
```

## Backend base

El backend ya incluye:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/forgot-password/verify`
- `POST /api/auth/forgot-password/reset`
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
- recuperacion de clave por correo con codigo OTP de 6 digitos
- consulta de usuario autenticado
- catalogo publico con filtros basicos
- creacion de productos protegida por rol admin o seller
- carga de imagenes de productos en Cloudinary con metadata persistida en PostgreSQL
- creacion de pedidos con calculo de subtotal, IVA y descuento de stock
- snapshot de imagen en ventas para reportes y vistas historicas
- seed demo con admin, cliente y productos base

## Despliegue

La estructura ya nace lista para separar servicios:

- `mobile/` puede compilarse y publicarse en Google Play
- `backend/` puede desplegarse aparte en Railway, Render, Fly.io, Azure, AWS o GCP
- la app movil solo necesita apuntar a la URL publica del backend

## Arranque completo paso a paso

### Emulador Android

1. Verifica `backend/.env`
   - `DATABASE_URL` apuntando a Supabase
2. Verifica `mobile/.env`
   - `EXPO_PUBLIC_DATA_SOURCE=api`
   - `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:4000/api`
3. Arranca backend:

```bash
npm run backend:dev
```

4. Arranca mobile:

```bash
npm run mobile:start
```

5. Abre el emulador o usa:

```bash
npm run mobile:android
```

### Web o iOS simulador

1. Verifica `backend/.env`
2. En `mobile/.env` usa:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

3. Arranca backend:

```bash
npm run backend:dev
```

4. Arranca mobile:

```bash
npm run mobile:start
```

5. Abre web:

```bash
npm run mobile:web
```

### Telefono fisico con backend en tu PC

1. Verifica `backend/.env`
   - `DATABASE_URL` apuntando a Supabase
2. En `mobile/.env` usa la IP local de tu PC:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.100.17:4000/api
```

3. Arranca backend:

```bash
npm run backend:dev
```

4. Verifica desde el telefono:
   - abre `http://192.168.100.17:4000/api/health`
5. Si responde, instala y abre la app

## Cambio de entorno de base de datos

Para cambiar entre Supabase y local solo debes cambiar:

- [backend/.env](D:/codex/EcommerceBiess/backend/.env)

Variable:

```env
DATABASE_URL=...
```

Despues:

```bash
npm run backend:dev
```

No hace falta cambiar el movil por un cambio de base. El movil solo habla con la API.

## Despliegue en Render

El backend ya quedo preparado para Render con:

- blueprint en [render.yaml](D:/codex/EcommerceBiess/render.yaml)
- servicio enfocado solo en `backend/`
- health check en `/api/health`
- variables y secretos documentados

### Decision tecnica usada

La opcion elegida para este repo es:

- Render `Web Service`
- despliegue desde monorepo
- `rootDir=backend`

Motivo:

- evita instalar y compilar `mobile/` en Render
- reduce tiempo de build
- deja el despliegue mas transparente
- el backend ya tiene su propio `package.json`

### Estado del blueprint

Archivo:

- [render.yaml](D:/codex/EcommerceBiess/render.yaml)

Configuracion actual:

- `name: ecommerce-biess-api`
- `runtime: node`
- `plan: free`
- `rootDir: backend`
- `buildCommand: npm install && npm run build`
- `startCommand: npm run start`
- `healthCheckPath: /api/health`

Nota sobre plan:

- deje `plan: free` para la primera prueba sin costo
- si luego quieres evitar cold starts o usarlo mas seriamente, cambia a `starter`

### Antes de crear el servicio en Render

1. Sube este repo a GitHub.
2. Usa la rama `main`.
3. En Render, crea un `Blueprint` o un `Web Service` conectado a ese repo.
4. Si usas Blueprint, Render leera [render.yaml](D:/codex/EcommerceBiess/render.yaml).

### Variables y secretos que debes mapear en Render

#### Variables con valor publico o controlado

Estas ya quedaron definidas en [render.yaml](D:/codex/EcommerceBiess/render.yaml):

- `NODE_ENV=production`
- `CORS_ORIGIN=*`
- `JWT_EXPIRES_IN=7d`
- `PAYPHONE_API_BASE_URL=https://pay.payphonetodoesposible.com/api`
- `PAYPHONE_COUNTRY_CODE=593`
- `CLOUDINARY_PRODUCTS_FOLDER=products`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`
- `SMTP_FROM_NAME=Soporte`
- `PASSWORD_RESET_CODE_TTL_MINUTES=15`
- `PASSWORD_RESET_MAX_ATTEMPTS=5`

#### Secretos que debes cargar manualmente en Render

Estos aparecen con `sync: false` en [render.yaml](D:/codex/EcommerceBiess/render.yaml), por lo tanto debes pegarlos manualmente en Render durante la creacion inicial del Blueprint o luego en el Dashboard:

- `DATABASE_URL`
- `JWT_SECRET`
- `PAYPHONE_STORE_ID`
- `PAYPHONE_TOKEN`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `SMTP_HOST`
- `SMTP_USER`
- `SMTP_PASS`

### Mapeo exacto recomendado de variables

Usa este mapeo al cargar el servicio en Render:

```env
DATABASE_URL=postgresql://postgres:[SUPABASE_PASSWORD]@db.[SUPABASE_PROJECT_REF].supabase.co:5432/postgres
JWT_SECRET=[UN_VALOR_LARGO_Y_ALEATORIO]
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
PAYPHONE_API_BASE_URL=https://pay.payphonetodoesposible.com/api
PAYPHONE_COUNTRY_CODE=593
PAYPHONE_STORE_ID=[PAYPHONE_STORE_ID]
PAYPHONE_TOKEN=[PAYPHONE_TOKEN]
CLOUDINARY_CLOUD_NAME=[CLOUDINARY_CLOUD_NAME]
CLOUDINARY_API_KEY=[CLOUDINARY_API_KEY]
CLOUDINARY_API_SECRET=[CLOUDINARY_API_SECRET]
CLOUDINARY_PRODUCTS_FOLDER=products
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=[GMAIL_O_CORREO_SMTP]
SMTP_PASS=[APP_PASSWORD_O_SMTP_SECRET]
SMTP_FROM_NAME=Soporte
PASSWORD_RESET_CODE_TTL_MINUTES=15
PASSWORD_RESET_MAX_ATTEMPTS=5
```

### Recomendacion puntual para CORS

Como tu app actual solo consume desde:

- emulador
- telefono fisico
- APK release

Y no tienes frontend web, la configuracion recomendada por ahora es:

```env
CORS_ORIGIN=*
```

Si luego agregas web, ahi si conviene restringirlo.

### Health check recomendado

Usa exactamente:

```text
/api/health
```

### Build y start que usara Render

Como Render trabajara relativo a `backend/`, los comandos correctos son:

```bash
npm install && npm run build
npm run start
```

### Lo que debes hacer luego del primer deploy

1. Esperar que el deploy termine.
2. Abrir la URL publica de Render.
3. Probar:

```text
https://ecommerce-biess-api.onrender.com/api/health
```

4. Si responde `ok`, probar:
   - login admin
   - login seller
   - listado de productos
   - carga de imagenes
   - recuperacion de clave

### Cambio que debera hacerse luego en mobile

Cuando el backend ya este corriendo en Render, la app movil debera apuntar a esa URL publica.

Ejemplo:

```env
EXPO_PUBLIC_API_BASE_URL=https://ecommerce-biess-api.onrender.com/api
```

### Seguridad importante

No dejes valores reales de estos secretos en Git:

- `DATABASE_URL`
- `PAYPHONE_TOKEN`
- `CLOUDINARY_API_SECRET`
- `SMTP_PASS`
- `JWT_SECRET`

Si alguno de esos valores ya fue expuesto antes, lo correcto es rotarlo antes del despliegue productivo.

## Plan de migracion a Supabase

Este proyecto puede migrarse a Supabase sin reescribir el backend ni romper el flujo actual. La recomendacion es usar Supabase solo como PostgreSQL gestionado. La autenticacion, logica de negocio, Cloudinary, PayPhone, auditoria y permisos siguen viviendo en NestJS.

### Objetivo tecnico

- mantener intacto el backend actual
- mantener intacta la base local mientras se valida Supabase
- migrar esquema y datos a un proyecto nuevo de Supabase
- cambiar solo `DATABASE_URL` cuando la validacion este cerrada
- dejar un rollback simple a la base local

### Decision de conexion

Para este backend con Prisma y Node, la conexion recomendada en Supabase es:

- `Supavisor session mode` si el servidor usa IPv4
- `direct connection` solo si el entorno soporta IPv6 o si el proyecto tiene IPv4 add-on

Para este repo, lo mas probable es usar `Supavisor session mode`, porque:

- Prisma en Supabase recomienda session pooler para conexiones persistentes
- el backend actual es un servicio persistente, no serverless
- el entorno de trabajo local en Windows normalmente no usa IPv6 directo hacia Supabase

No usar `transaction mode` para la conexion principal del backend.

### Lo que no cambia

- no se migra a Supabase Auth
- no se migra a Supabase Storage por ahora
- no se reemplaza NestJS por PostgREST o Data API
- el movil sigue consumiendo el backend NestJS

### Fase 0: Preparacion

1. Crear un proyecto nuevo de Supabase para pruebas, no reutilizar uno ya contaminado con pruebas anteriores.
2. Obtener desde `Connect`:
   - Session pooler connection string
   - password de base de datos
3. Confirmar version de PostgreSQL local:

```sql
select version();
```

4. Confirmar tamano de base local:

```sql
select pg_size_pretty(pg_database_size(current_database())) as size;
```

5. Confirmar extensiones activas en local:

```sql
select extname from pg_extension order by extname;
```

### Fase 1: Respaldo local obligatorio

Antes de tocar Supabase, generar un respaldo completo de la base local.

Ejemplo conceptual:

```bash
pg_dump ^
  --host=localhost ^
  --port=5432 ^
  --username=postgres ^
  --dbname=ecommerce_biess ^
  --format=custom ^
  --no-owner ^
  --no-privileges ^
  --file=backup-local-ecommerce_biess.dump
```

Regla:

- no borrar ni modificar la base local durante la migracion
- la base local queda como rollback inmediato

### Fase 2: Preparar Supabase como destino

1. En Supabase, usar la base por defecto `postgres`.
2. Confirmar que el schema de trabajo siga siendo `public`.
3. Verificar conexion con session pooler.
4. No cargar datos manuales desde el dashboard.
5. No crear tablas a mano desde SQL Editor si ya existe el esquema local completo.

### Fase 3: Migracion de esquema

La ruta mas segura para este proyecto es:

1. exportar primero el esquema desde local
2. restaurarlo en Supabase
3. luego cargar datos

Motivo:

- el backend ya tiene muchas tablas, enums, relaciones, `json`, `bytes`, indices y `decimal`
- es mejor respetar la estructura real antes de insertar datos
- evita que `prisma db push` genere diferencias no deseadas sobre un ambiente con datos

Exportar esquema:

```bash
pg_dump ^
  --host=localhost ^
  --port=5432 ^
  --username=postgres ^
  --dbname=ecommerce_biess ^
  --schema-only ^
  --no-owner ^
  --no-privileges ^
  --format=plain ^
  --file=schema-local.sql
```

Restaurar esquema en Supabase:

```bash
psql "postgresql://<session-pooler-connection-string>" -f schema-local.sql
```

Revision posterior:

- validar que existan tablas clave:
  - `users`
  - `roles`
  - `product`
  - `order`
  - `orderitem`
  - `empresa`
  - `auditoria`
- validar que existan enums:
  - `OrderStatus`
  - `OrderFlowStatus`
  - `PaymentStatus`

### Fase 4: Migracion de datos

Con el esquema ya creado en Supabase, cargar los datos desde local.

Exportar datos:

```bash
pg_dump ^
  --host=localhost ^
  --port=5432 ^
  --username=postgres ^
  --dbname=ecommerce_biess ^
  --data-only ^
  --no-owner ^
  --no-privileges ^
  --format=plain ^
  --file=data-local.sql
```

Restaurar datos:

```bash
psql "postgresql://<session-pooler-connection-string>" -f data-local.sql
```

Si el volumen de datos crece, se puede pasar a `custom` o `directory dump` con `pg_restore`, pero para el estado actual del proyecto la version `plain` es suficiente y mas facil de revisar.

### Fase 5: Validacion en Supabase antes del corte

Antes de cambiar el backend a Supabase, validar como minimo:

1. Conteos por tabla:

```sql
select 'users' as table_name, count(*) from "User"
union all
select 'roles', count(*) from roles
union all
select 'products', count(*) from "Product"
union all
select 'orders', count(*) from "Order"
union all
select 'order_items', count(*) from "OrderItem"
union all
select 'empresa', count(*) from empresa
union all
select 'auditoria', count(*) from auditoria;
```

2. Integridad referencial:

- productos con `sellerId` valido
- orders con `userId` valido
- order items con `productId`, `sellerId` y `orderId` validos

3. Datos sensibles y funcionales:

- usuarios pueden iniciar sesion
- productos cargan bien
- `empresa` existe y trae branding
- imagenes de Cloudinary siguen funcionando
- PayPhone sigue operando igual
- recuperacion de clave por correo sigue funcionando
- auditoria sigue insertando registros

### Fase 6: Corte controlado del backend

Solo despues de validar Supabase:

1. copiar la cadena de conexion Supabase al archivo de entorno del backend
2. reiniciar backend
3. ejecutar pruebas funcionales

Cambio esperado:

```env
DATABASE_URL=postgresql://<supabase-session-pooler-connection-string>
```

No cambiar nada en `mobile/.env`. El movil no sabe si el backend usa PostgreSQL local o Supabase.

### Fase 7: Pruebas funcionales posteriores al corte

Probar en este orden:

1. `GET /api/health`
2. login admin
3. login seller
4. login customer
5. listar productos
6. crear producto
7. editar producto
8. crear pedido COD
9. crear pedido PayPhone
10. consultar pedidos
11. auditoria
12. recuperacion de clave
13. cargar logo de empresa

### Fase 8: Rollback

Si algo falla, el rollback debe ser inmediato:

1. restaurar `DATABASE_URL` del backend al valor local
2. reiniciar backend
3. continuar operando con la base local

Eso funciona porque el backend actual depende de una sola variable de conexion.

### Riesgos concretos a controlar

- usar el connection string equivocado:
  - no usar transaction pooler para el backend persistente
- restaurar sobre un proyecto Supabase con residuos viejos
- cargar datos sin haber validado primero el esquema
- perder trazabilidad por hacer pruebas destructivas en local antes del respaldo
- dejar secretos reales en `README`, `.env.example` o Git

### Recomendacion operacional para este repo

La mejor estrategia para este proyecto es:

1. crear un proyecto Supabase nuevo de pruebas
2. migrar primero esquema y datos
3. validar todo con backend apuntando a Supabase en ambiente de prueba
4. solo despues decidir si Supabase pasa a ser la base principal

### Checklist final de aprobacion

Migracion aprobada solo si:

- el conteo de tablas clave coincide
- login funciona para los roles actuales
- Cloudinary sigue respondiendo
- pedidos COD funcionan
- pedidos PayPhone funcionan
- auditoria inserta correctamente
- recuperacion de clave envia correo
- `empresa` responde branding e IVA

### Fuentes oficiales

- Supabase: migrar Postgres a Supabase  
  https://supabase.com/docs/guides/platform/migrating-to-supabase/postgres
- Supabase: connection strings y poolers  
  https://supabase.com/docs/reference/postgres/connection-strings
- Supabase: Prisma con Supabase  
  https://supabase.com/docs/guides/database/prisma
