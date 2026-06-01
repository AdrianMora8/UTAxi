# Registers a scheduled task to run `start-at-login.ps1` on user logon.
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Split-Path -Parent $scriptDir
$startScript = "$projectRoot\scripts\start-at-login.ps1"

if (-Not (Test-Path $startScript)) {
    Write-Error "Start script not found: $startScript"
    exit 1
}

$taskName = "UTAxi Start"
$action = "powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$startScript`""

Write-Output "Registering scheduled task '$taskName' to run at user logon..."
schtasks /Create /SC ONLOGON /TN "$taskName" /TR "$action" /F | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Output "Task registered. It will run at next logon."
} else {
    Write-Error "Failed to register scheduled task. Exit code: $LASTEXITCODE"
}
