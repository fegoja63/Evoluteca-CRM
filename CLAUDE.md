# CLAUDE.md — Evoluteca CRM

Contexto e instrucciones que Claude Code carga automáticamente al trabajar en este repo.

## Flujo de trabajo con Claude (OBLIGATORIO)

Para cualquier cambio de código:

1. **Trabajar en una rama**, nunca commitear directo a `master`.
2. **Abrir un PR** hacia `master`. Esto genera un **preview en Vercel** (contra la base
   `desarrollo`) para revisar el cambio en vivo.
3. **Esperar el visto bueno explícito del usuario** antes de mergear.
   Claude **no mergea a `master` por su cuenta** — publicar a `master` despliega a
   **producción** (clientes reales), así que esa decisión siempre la aprueba el usuario.
4. Tras el "OK", Claude hace el merge; Vercel despliega producción solo.

Lo mecánico (escribir código, abrir PR, mergear tras el OK) lo hace Claude a pedido.
La decisión de "esto está listo para producción" es siempre del usuario.

## Entornos y bases de datos

Producción, preview y local usan **bases separadas** — ver [docs/ENTORNOS.md](docs/ENTORNOS.md).

- **Producción** (Vercel `master`) → rama Neon `production` (`ep-holy-leaf`). Datos reales, intocables.
- **Preview** (PRs) y **local** (`npm run dev`, `scripts/*`) → rama Neon `desarrollo` (`ep-muddy-tree`).
- **Nunca** apuntar el `.env` local a producción. Antes de correr un `seed`, verificar el
  host: `grep DATABASE_URL .env` (debe decir `ep-muddy-tree`, no `ep-holy-leaf`).

## Repo canónico

Uno solo: `github.com/fegoja63/Evoluteca-CRM` (el que despliega Vercel). Sin push doble a otros repos.

## Stack

Next.js (App Router, TypeScript) + Tailwind · Prisma + PostgreSQL (Neon) · NextAuth (Auth.js v5) ·
multi-tenant (cada empresa es un `Tenant` aislado) · roles ADMINISTRADOR / GERENTE / COMERCIAL.

## Pruebas (vitest)

- Todas las carpetas y sesiones usan **la misma base de pruebas** (rama Neon `test`, `ep-gentle-tooth`).
  Cada `vitest run` toma un **candado** en esa base ([src/test/candado.ts](src/test/candado.ts)): si otra
  corrida la está usando, espera su turno y dice quién la tiene. `npm run test:reconstruir-db` usa el mismo candado.
- Antes de correr se verifica que el **cliente de Prisma** corresponda a `prisma/schema.prisma` de la carpeta
  ([src/test/global-setup.ts](src/test/global-setup.ts)). Un worktree sin `node_modules` propio usa el de la
  carpeta principal; si no coinciden, correr `npm ci` en el worktree.
- Toda ruta `/[id]` nueva necesita su entrada en `PARAMS_DEL_CLIENTE_A` de `src/test/rutas/detalle.test.ts`
  y un registro sembrado en `src/test/sembrar.ts`.

## Carpeta principal al día

Las sesiones trabajan en worktrees y mergean por GitHub, así que la carpeta principal se queda atrás de
`master`. `node scripts/sincronizar-carpeta-principal.mjs` la adelanta (solo fast-forward, solo si está en
`master` y limpia; si no, no toca nada y lo dice). Corre solo al abrir cada sesión (hook `SessionStart`
en [.claude/settings.json](.claude/settings.json)); también se puede correr a mano tras un merge.
