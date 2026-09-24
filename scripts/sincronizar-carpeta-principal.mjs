// Pone la carpeta principal del repo al dia con origin/master.
//
// Lo corre el hook SessionStart de .claude/settings.json al abrir cualquier
// sesion (en la carpeta principal o en un worktree). Las sesiones trabajan en
// worktrees y mergean por GitHub, asi que nadie hacia `git pull` en la
// carpeta principal y se quedaba atras de master.
//
// Solo avanza (fast-forward) y solo si la carpeta principal esta en master y
// LIMPIA: nunca mezcla, nunca pisa trabajo de otra sesion. Si algo no cuadra,
// no toca nada y lo dice. Nunca falla la sesion: siempre sale con codigo 0.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));

function git(args, cwd, timeout = 20_000) {
  return execFileSync("git", args, { cwd, encoding: "utf8", timeout, stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function avisar(mensaje) {
  // Formato de salida de un hook SessionStart: lo ve el usuario y Claude.
  console.log(
    JSON.stringify({
      systemMessage: mensaje,
      hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: mensaje },
    })
  );
}

try {
  const comun = git(["rev-parse", "--path-format=absolute", "--git-common-dir"], aqui);
  const principal = path.dirname(comun);

  const rama = git(["rev-parse", "--abbrev-ref", "HEAD"], principal);
  if (rama !== "master") {
    avisar(`Carpeta principal en la rama "${rama}", no en master: no se sincronizo.`);
    process.exit(0);
  }
  if (git(["status", "--porcelain"], principal)) {
    avisar("Carpeta principal con cambios sin commitear: no se sincronizo con master (se deja intacta).");
    process.exit(0);
  }

  try {
    git(["fetch", "--quiet", "origin", "master"], principal, 30_000);
  } catch {
    avisar("Sin conexion con GitHub: la carpeta principal no se sincronizo con master (se reintenta en la proxima sesion).");
    process.exit(0);
  }

  const antes = git(["rev-parse", "HEAD"], principal);
  const despues = git(["rev-parse", "origin/master"], principal);
  if (antes === despues) process.exit(0);

  // Si la carpeta principal tiene commits que no estan en master, no se toca.
  const esAncestro = (() => {
    try {
      git(["merge-base", "--is-ancestor", antes, despues], principal);
      return true;
    } catch {
      return false;
    }
  })();
  if (!esAncestro) {
    avisar("Carpeta principal con commits que no estan en origin/master: no se sincronizo (revisar a mano).");
    process.exit(0);
  }

  const cambiados = git(["diff", "--name-only", antes, despues], principal).split("\n");
  git(["merge", "--ff-only", "--quiet", despues], principal);

  const n = git(["rev-list", "--count", `${antes}..${despues}`], principal);
  let mensaje = `Carpeta principal puesta al dia con master (+${n} commits).`;
  if (cambiados.includes("package-lock.json")) {
    mensaje += " Cambiaron las dependencias: correr `npm ci` en la carpeta principal.";
  } else if (cambiados.includes("prisma/schema.prisma")) {
    mensaje += " Cambio el esquema de Prisma: correr `npx prisma generate` en la carpeta principal.";
  }
  avisar(mensaje);
} catch (e) {
  // Sin red, sin git, lo que sea: la sesion arranca igual.
  const detalle = e instanceof Error ? e.message.split("\n")[0] : String(e);
  avisar(`No se pudo sincronizar la carpeta principal con master (${detalle}).`);
}
process.exit(0);
