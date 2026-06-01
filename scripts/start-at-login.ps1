# Starts Docker Compose services and opens the app in the default browser.
# Designed to be run at user logon. Retries until Docker is available.
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Split-Path -Parent $scriptDir

Write-Output "Waiting for Docker to become available..."
while ($true) {
    try {
        docker info | Out-Null
        break
    } catch {
        Start-Sleep -Seconds 2
    }
}

Write-Output "Starting containers..."
Start-Process -FilePath docker -ArgumentList @('compose','-f',"$projectRoot/docker-compose.yml",'up','-d') -NoNewWindow -Wait

# Wait for server port to be ready
$url = 'http://localhost'
for ($i = 0; $i -lt 30; $i++) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}

Start-Process $url
