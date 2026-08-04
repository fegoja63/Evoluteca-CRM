# Entornos y bases de datos — Evoluteca CRM

Guía para mantener **producción, preview y desarrollo local separados**, y evitar
la confusión que se dio al tener todo apuntando a la misma base de producción.

> **Regla de oro:** cada entorno tiene su **propia** base de datos. Nadie experimenta
> ni corre `seed` contra producción.

---

## 1. Arquitectura objetivo

| Entorno | Dónde corre | Base de datos (Neon) | Uso |
|---|---|---|---|
| **Production** | Vercel, rama `master` | rama `main` (`ep-holy-leaf`) | Datos reales de clientes. Intocable. |
| **Preview** | Vercel, cada PR / rama | rama Neon `preview` | Revisar PRs en vivo, sin arriesgar prod. |
| **Development** | Tu máquina (`.env`) | rama Neon `dev` | Programar, probar, `seed`, sin miedo. |

**Un solo repo canónico:** `github.com/fegoja63/Evoluteca-CRM` (es el que Vercel
despliega). El repo `evoluteca/evoluteca-crm-sprint1` quedó fuera del flujo — sigue
en GitHub como histórico, pero ya **no** es un remoto local ni recibe push.

---

## 2. Por qué esto importa

El build corre `prisma migrate deploy && prisma generate && next build`. Prisma
**exige** `DATABASE_URL` y `DIRECT_URL` en *todos* los entornos donde se construye.
Si Preview no las tiene, el build de cada PR muere en segundos (error `P1012:
Environment variable not found: DIRECT_URL`). Por eso hay que poblar las variables
en los tres scopes de Vercel.

`DIRECT_URL` = conexión directa (para migraciones). `DATABASE_URL` = pooler (para la
app). En Neon, cada rama te da ambas cadenas.

---

## 3. Paso a paso

### Paso 1 — Crear las ramas de base de datos en Neon

**Opción A — Consola web (https://console.neon.tech):**
1. Abre el proyecto de Evoluteca CRM.
2. Menú **Branches → New branch**.
3. Crea `preview` (parte de `main`). Repite y crea `dev`.
4. En cada rama, **Connect** → copia las dos cadenas:
   - *Pooled connection* → será `DATABASE_URL`
   - *Direct connection* → será `DIRECT_URL`

**Opción B — CLI (`neonctl`):**
```bash
npx neonctl branches create --name preview
npx neonctl branches create --name dev
npx neonctl connection-string preview --pooled   # -> DATABASE_URL de preview
npx neonctl connection-string preview            # -> DIRECT_URL de preview
npx neonctl connection-string dev --pooled       # -> DATABASE_URL de dev
npx neonctl connection-string dev                # -> DIRECT_URL de dev
```

> Alternativa rápida sin crear ramas nuevas: reutilizar la base huérfana
> `ep-muddy-tree` (la que quedó de la confusión anterior) como base de **dev**.
> Su cadena está guardada localmente en `.env.ep-muddy-tree.orphan.bak`.

### Paso 2 — Cargar las variables en Vercel (Preview y Development)

Producción **ya** las tiene. Falta Preview y Development.

**Consola:** Vercel → proyecto `evoluteca-crm` → **Settings → Environment Variables**.
Agrega, marcando solo el entorno correspondiente:

| Variable | Preview (rama `preview`) | Development (rama `dev`) |
|---|---|---|
| `DATABASE_URL` | cadena *pooled* de `preview` | cadena *pooled* de `dev` |
| `DIRECT_URL` | cadena *direct* de `preview` | cadena *direct* de `dev` |

Marca ambas como **Sensitive** (igual que en Production).

**CLI (equivalente):**
```bash
vercel env add DATABASE_URL preview
vercel env add DIRECT_URL   preview
vercel env add DATABASE_URL development
vercel env add DIRECT_URL   development
```
(El CLI te pide pegar el valor de cada una.)

> Tras esto, cada PR nuevo genera un **preview que sí construye**, contra la base
> `preview` — nunca contra datos reales.

### Paso 3 — Repuntar tu `.env` local a la base `dev`

Hoy tu `.env` apunta a **producción** (se cambió para desbloquear un problema
puntual). Déjalo apuntando a `dev`:

```bash
# Trae las variables del scope Development ya configurado en el Paso 2:
vercel env pull .env --environment=development
```
o edita a mano `DATABASE_URL` y `DIRECT_URL` en `.env` con las cadenas de la rama `dev`.

Verifica el host:
```bash
grep -E '^DATABASE_URL' .env    # debe decir la rama dev, NO ep-holy-leaf
```

---

## 4. Verificación final

- **Preview:** abre un PR de prueba → Vercel debe dar un deploy de preview **Ready**
  con URL propia.
- **Local:** `npm run dev` y un `seed` deben afectar solo la base `dev`.
- **Producción:** intacta; solo cambia al hacer merge a `master`.

---

## 5. Reglas de trabajo (para no repetir la confusión)

1. **Nunca** apuntes `.env` local a producción. Local = rama `dev`.
2. **Un** repo: `fegoja63/Evoluteca-CRM`. Nada de push doble a otros repos.
3. Los `seed` (`scripts/*.ts`) corren contra la base que diga tu `.env` — verifica
   el host antes de correrlos (`grep DATABASE_URL .env`).
4. Deploy a producción = **merge a `master`** vía PR. El preview del PR es tu
   verificación antes de que llegue a los clientes.
5. Archivos `.env*` están en `.gitignore` — nunca subas credenciales al repo.

---

## Apéndice — Estado a la fecha de esta guía

- `master` local y `origin` = `fegoja63/Evoluteca-CRM` (consolidado).
- Producción corre sobre `ep-holy-leaf`.
- `ep-muddy-tree` = base huérfana (copia vieja), candidata a ser la base `dev`.
- Pendiente: Pasos 1–3 (crear ramas Neon + variables en Vercel Preview/Development
  + repuntar `.env` local).
