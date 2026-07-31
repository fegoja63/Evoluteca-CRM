# ====================================================================
#  Vigia del respaldo diario de Evoluteca CRM.
#
#  Complementa a backup-diario.cmd. Ese script solo deja la alarma
#  _FALLO.txt cuando falla LIMPIAMENTE; si el proceso se mata a la
#  fuerza (equipo dormido/apagado a mitad de la copia) muere sin dejar
#  rastro, y el atraso pasa en silencio. Fue justo lo que ocurrio entre
#  el 28 y el 31 de julio de 2026.
#
#  Este vigia corre por su cuenta cada dia y revisa una sola cosa:
#  cuando fue el ultimo respaldo. Si el mas reciente tiene mas de 2 dias
#  (o no hay ninguno), deja un _FALLO.txt bien visible. Asi la regla del
#  documento vuelve a ser cierta: "si no hay _FALLO.txt, todo esta bien".
# ====================================================================

$destino     = Join-Path $env:OneDrive "Respaldos-Evoluteca-CRM\produccion"
$alarma      = Join-Path $env:OneDrive "Respaldos-Evoluteca-CRM\_FALLO.txt"
$umbralHoras = 48

$ultimo = Get-ChildItem -Path $destino -Directory -Filter "backup-*" -ErrorAction SilentlyContinue |
          Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $ultimo) {
  $msg = @(
    "El respaldo automatico no ha generado NINGUNA copia en la carpeta:",
    "  $destino",
    "",
    "Revisa la tarea 'Evoluteca CRM - Respaldo diario' en el Programador de tareas,",
    "o pide que se revise el respaldo."
  )
  $msg | Out-File -FilePath $alarma -Encoding UTF8
  Write-Output "ALARMA: no hay ningun respaldo."
  exit 1
}

$horas = (New-TimeSpan -Start $ultimo.LastWriteTime -End (Get-Date)).TotalHours

if ($horas -gt $umbralHoras) {
  $fecha = $ultimo.LastWriteTime.ToString("yyyy-MM-dd HH:mm")
  $dias  = [math]::Round($horas / 24, 1)
  $msg = @(
    "El ultimo respaldo de la base de datos es del $fecha,",
    "es decir hace aproximadamente $dias dias.",
    "",
    "El respaldo diario dejo de correr bien. No se pierde nada todavia,",
    "pero avisa para revisarlo cuanto antes.",
    "",
    "Carpeta de respaldos: $destino"
  )
  $msg | Out-File -FilePath $alarma -Encoding UTF8
  Write-Output "ALARMA: ultimo respaldo hace $dias dias."
  exit 1
}

# Todo bien: si habia una alarma vieja, se limpia.
if (Test-Path $alarma) { Remove-Item $alarma -Force }
Write-Output "OK: ultimo respaldo hace $([math]::Round($horas,1)) horas."
exit 0
