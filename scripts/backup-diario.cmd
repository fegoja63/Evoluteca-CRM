@echo off
REM ====================================================================
REM  Respaldo diario de la base de datos de PRODUCCION de Evoluteca CRM.
REM  Lo ejecuta el Programador de tareas de Windows una vez al dia.
REM
REM  Historia de dos fallos que este archivo ya no permite:
REM
REM  1. Apuntaba a una carpeta del proyecto que dejo de existir al mover
REM     el repositorio. La tarea "terminaba bien" sin respaldar nada, y
REM     nadie se entero en tres dias. Ahora comprueba la carpeta antes.
REM
REM  2. Usaba .env, que apunta a la rama "desarrollo" de Neon: respaldaba
REM     la base de pruebas, no la de los clientes. Ahora usa .env.backup,
REM     que apunta a produccion.
REM
REM  Cuando algo falla se deja un archivo _FALLO.txt bien visible en la
REM  carpeta de respaldos, y se borra solo cuando vuelve a salir bien.
REM ====================================================================

set "PROY=C:\Users\felip\dev\evoluteca-crm-sprint1"
set "DESTINO=%OneDrive%\Respaldos-Evoluteca-CRM"
set "LOG=%DESTINO%\_log.txt"
set "ALARMA=%DESTINO%\_FALLO.txt"

if not exist "%DESTINO%" mkdir "%DESTINO%"

echo ---------- %DATE% %TIME% ---------- >> "%LOG%"

if not exist "%PROY%\scripts\backup-db.ts" (
  echo ERROR: no se encuentra el proyecto en "%PROY%" >> "%LOG%"
  echo El respaldo NO se ejecuto el %DATE% a las %TIME%. > "%ALARMA%"
  echo Causa: no se encuentra el proyecto en "%PROY%". >> "%ALARMA%"
  echo Si moviste la carpeta del proyecto, corrige PROY en scripts\backup-diario.cmd >> "%ALARMA%"
  exit /b 1
)

if not exist "%PROY%\.env.backup" (
  echo ERROR: falta .env.backup con las credenciales de produccion >> "%LOG%"
  echo El respaldo NO se ejecuto el %DATE% a las %TIME%. > "%ALARMA%"
  echo Causa: falta el archivo .env.backup en "%PROY%". >> "%ALARMA%"
  exit /b 1
)

cd /d "%PROY%"
"C:\Program Files\nodejs\node.exe" --env-file=.env.backup "scripts\backup-db.ts" >> "%LOG%" 2>&1

if errorlevel 1 (
  echo ERROR: el respaldo fallo con codigo %errorlevel% >> "%LOG%"
  echo El respaldo FALLO el %DATE% a las %TIME%. > "%ALARMA%"
  echo Revisa el detalle en "%LOG%". >> "%ALARMA%"
  exit /b 1
)

REM Salio bien: se borra la alarma anterior, si la habia.
if exist "%ALARMA%" del "%ALARMA%"
echo (fin, correcto) >> "%LOG%"
