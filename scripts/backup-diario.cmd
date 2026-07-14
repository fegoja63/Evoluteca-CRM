@echo off
REM Respaldo diario de la base de datos de Evoluteca CRM.
REM Lo ejecuta el Programador de tareas de Windows una vez al dia.
REM Guarda una copia completa en OneDrive (fuera de Neon) y deja un log.

set "PROY=C:\Users\felip\OneDrive\Desktop\Info FGJ\evoluteca-crm-sprint1 V2"
set "DESTINO=%OneDrive%\Respaldos-Evoluteca-CRM"

if not exist "%DESTINO%" mkdir "%DESTINO%"

cd /d "%PROY%"
echo ---------- %DATE% %TIME% ---------- >> "%DESTINO%\_log.txt"
"C:\Program Files\nodejs\node.exe" --env-file=.env "scripts\backup-db.ts" >> "%DESTINO%\_log.txt" 2>&1
echo (fin) >> "%DESTINO%\_log.txt"
