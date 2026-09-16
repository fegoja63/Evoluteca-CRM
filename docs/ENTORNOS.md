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

## 6. Zona horaria (producción) — resuelta en el código

Vercel corre las funciones en **UTC** por defecto. Los campos de **fecha-hora**
(horarios de funciones, actividades de la agenda) llegan del formulario como hora
"de pared" sin zona (`datetime-local`, ej. `2026-10-20T19:00`) y el servidor las
interpreta con `new Date(...)` **en la zona del servidor**. En UTC, "7:00 p.m."
se guarda como `19:00Z` y un usuario en Colombia (UTC-5) la ve como **2:00 p.m.**
— corrimiento de 5 horas. En local no se ve porque el equipo ya está en Bogotá.

**No se puede** arreglar con una variable `TZ` en Vercel: `TZ` es un **nombre
reservado** (AWS Lambda la fija en UTC) y el dashboard rechaza guardarla.

**Arreglo (en código, sin configurar nada):** como Colombia es **UTC-5 fijo**
todo el año (sin horario de verano), las horas de formulario se anclan
explícitamente a `-05:00` antes de guardarlas, en
[`src/lib/fecha-bogota.ts`](../src/lib/fecha-bogota.ts):

- `anclarBogota` — `preprocess` de Zod en `fechaValida`/`fechaOpcional`
  ([`src/lib/validations/campos.ts`](../src/lib/validations/campos.ts)); cubre
  funciones, agenda y expedientes.
- `fechaDesdeBogota` — para código que arma la fecha a mano (creación de
  temporadas, `api/funciones/temporada`).
- `aInputDatetimeLocal` — precarga el `<input datetime-local>` al editar en hora
  de Bogotá (antes usaba `toISOString()`, que corría 5h).

> Verificado: la lógica de reportes/plazos/cotizaciones ya era **robusta a la
> zona** (tests pasan bajo `TZ=UTC` y `TZ=America/Bogota`) y los crons usan
> instantes absolutos. Este arreglo solo corrige el parseo de las horas de
> formulario, sin efectos colaterales — y funciona sin importar la zona del
> servidor.
>
> Los registros de fecha-hora creados por formulario **antes** de este arreglo
> quedaron corridos; corregirlos es una limpieza de datos aparte.

---

## 7. Respaldo diario (producción)

El cron `/api/cron/respaldo` (Vercel, 02:00 Colombia) vuelca toda la base,
la comprime, la **cifra** (AES-256-GCM) y la sube a **Vercel Blob**. El correo
solo lleva el **enlace** de descarga y el resumen — ya no un adjunto, así que
**no hay tope de 15 MB** y el respaldo no deja de salir cuando la base crece.
Se cifra porque las URLs de Blob son públicas: aunque el enlace se filtre, sin
la clave el contenido es ilegible.

### Puesta en marcha (una vez)

1. **Blob store:** Vercel → proyecto `evoluteca-crm` → **Storage → Create/Connect**
   un **Blob** store y conéctalo al proyecto. Vercel agrega solo la variable
   `BLOB_READ_WRITE_TOKEN` (Production).
2. **Clave de cifrado:** genera una con `openssl rand -hex 32` y ponla en Vercel
   como `RESPALDO_CLAVE` (Production). **Guárdala aparte** (gestor de contraseñas):
   sin ella el respaldo no se puede restaurar.
3. **Destino del aviso (opcional):** `RESPALDO_EMAIL` (si falta, usa `GMAIL_USER`).

### Restaurar un respaldo (en una base de PRUEBA, nunca producción)

```bash
# 1. Descarga el archivo .json.gz.enc desde el enlace del correo.
# 2. Descífralo y conviértelo al formato de carpeta (necesita RESPALDO_CLAVE en .env):
node --env-file=.env scripts/descifrar-respaldo.ts <archivo.json.gz.enc> <carpeta>
# 3. Restaura esa carpeta en la base de prueba:
CONFIRMO_BORRAR_DESTINO=si node --env-file=.env.test scripts/restaurar-db.ts <carpeta>
```

> `restaurar-db.ts` se niega a escribir sobre producción (`ep-holy-leaf`) por
> nombre de servidor. El respaldo manual a demanda sigue siendo
> `scripts/backup-db.ts` (copia local, sin cifrar, a OneDrive).

---

## Apéndice — Estado a la fecha de esta guía

- `master` local y `origin` = `fegoja63/Evoluteca-CRM` (consolidado).
- Producción corre sobre `ep-holy-leaf`.
- `ep-muddy-tree` = base huérfana (copia vieja), candidata a ser la base `dev`.
- Pendiente: Pasos 1–3 (crear ramas Neon + variables en Vercel Preview/Development
  + repuntar `.env` local).
