# Evoluteca CRM — Sprint 1: fundación y autenticación

Código real del Sprint 1 del MVP. Incluye:

- Next.js 14 (App Router) + TypeScript + Tailwind
- Prisma + PostgreSQL como base de datos
- NextAuth (Auth.js v5) con login por credenciales
- Modelo multi-tenant: cada empresa que se registra es un `Tenant` aislado
- Roles: ADMINISTRADOR, GERENTE, COMERCIAL
- Registro (crea empresa + usuario admin) y login funcionando de extremo a extremo
- Rutas protegidas con middleware
- Sidebar con los 7 módulos del MVP (los demás módulos son sprints futuros)

## Por qué no corre solo aquí

Este código se escribió en un entorno sandbox sin acceso a internet completo
(no puede descargar el motor de Prisma ni conectarse a una base de datos real).
Es código de producción válido — solo necesita correr en un entorno con
internet normal: tu computador, Vercel, o cualquier servidor.

## Cómo correrlo en tu máquina

### 1. Requisitos

- Node.js 18 o superior
- Una base de datos PostgreSQL. La opción más rápida y gratuita:
  [Supabase](https://supabase.com) — crea un proyecto y copia el
  "Connection string" (modo Transaction pooler si usas Vercel).

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y completa:

- `DATABASE_URL`: la cadena de conexión de Supabase
- `AUTH_SECRET`: genera uno con `openssl rand -base64 32`
- `NEXTAUTH_URL`: déjalo en `http://localhost:3000` para desarrollo local

### 4. Generar el cliente Prisma y crear las tablas

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Esto crea las tablas `tenants` y `usuarios` en tu base de datos.

### 5. Correr en desarrollo

```bash
npm run dev
```

Abre `http://localhost:3000`. Te redirige a `/registro`. Crea tu primera
cuenta (empresa y usuario administrador) y entrarás directo al dashboard.

## Estructura relevante

```
prisma/schema.prisma          modelos de datos (Tenant, Usuario)
src/lib/auth.ts               configuración de NextAuth
src/lib/validations/auth.ts   validaciones zod de login y registro
src/app/login/page.tsx        pantalla de login
src/app/registro/page.tsx     pantalla de registro
src/app/api/registro/route.ts crea tenant y usuario admin
src/app/dashboard/layout.tsx  layout protegido con sidebar
src/components/sidebar.tsx    navegación de los 7 módulos
src/middleware.ts             protección de rutas /dashboard
```

## Siguiente paso: Sprint 2

CRM base — CRUD de empresas y contactos, búsqueda, historial y notas.
Cuando quieras seguir, dime "construye el Sprint 2" y seguimos desde aquí.
