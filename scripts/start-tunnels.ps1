<#
  start-tunnels.ps1
  Opens two Cloudflare quick tunnels so the IIS-hosted API and web app can be reached over public HTTPS
  (for a real phone away from this laptop, or a demo to someone on another network), then prints
  exactly what to change for those addresses. The addresses change every time this runs.

  Needs cloudflared:  winget install Cloudflare.cloudflared
  Usage:  double-click scripts\start-tunnels.bat   (keep the window open for the whole demo)
#>
param(
    [int]$ApiPort = 8090,
    [int]$WebPort = 8091
)

$ErrorActionPreference = 'Stop'

$cloudflared = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cloudflared) {
    foreach ($p in "$env:ProgramFiles\cloudflared\cloudflared.exe", "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe") {
        if (Test-Path $p) { $cloudflared = $p; break }
    }
}
if (-not $cloudflared) {
    Write-Host 'cloudflared is not installed. Install it, then run this again:' -ForegroundColor Red
    Write-Host '    winget install Cloudflare.cloudflared' -ForegroundColor Yellow
    Read-Host 'Press Enter to close'
    exit 1
}

foreach ($port in $ApiPort, $WebPort) {
    try { Invoke-WebRequest "http://localhost:$port/" -UseBasicParsing -TimeoutSec 5 | Out-Null }
    catch {
        if (-not $_.Exception.Response) {
            Write-Host "Nothing answers on http://localhost:$port. Deploy it to IIS first (scripts\deploy-iis.bat, scripts\deploy-web-iis.bat)." -ForegroundColor Red
            Read-Host 'Press Enter to close'
            exit 1
        }
    }
}

function Start-Tunnel([int]$Port, [string]$Name) {
    $log = Join-Path $env:TEMP "solargridx-tunnel-$Name.log"
    Remove-Item $log -ErrorAction SilentlyContinue
    $proc = Start-Process $cloudflared -ArgumentList 'tunnel', '--url', "http://localhost:$Port", '--no-autoupdate' `
        -RedirectStandardError $log -RedirectStandardOutput "$log.out" -PassThru -WindowStyle Hidden
    for ($i = 0; $i -lt 45; $i++) {
        Start-Sleep 1
        if (Test-Path $log) {
            $m = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1
            if ($m) { return [pscustomobject]@{ Url = $m.Matches[0].Value; Process = $proc } }
        }
    }
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    throw "The $Name tunnel gave no address within 45 seconds (see $log)."
}

$tunnels = @()
try {
    Write-Host 'Starting tunnels...' -ForegroundColor Cyan
    $api = Start-Tunnel $ApiPort 'api'; $tunnels += $api
    $web = Start-Tunnel $WebPort 'web'; $tunnels += $web

    Write-Host ''
    Write-Host "Public API : $($api.Url)" -ForegroundColor Green
    Write-Host "Public web : $($web.Url)" -ForegroundColor Green
    Write-Host ''
    Write-Host 'Do these in order (the addresses above change next time):' -ForegroundColor Yellow
    Write-Host "  1. api\appsettings.Development.json -> add `"$($web.Url)`" to Cors:AllowedOrigins"
    Write-Host '  2. scripts\deploy-iis.bat                      (API picks up the new origin)'
    Write-Host "  3. scripts\deploy-web-iis.ps1 -ApiUrl $($api.Url)/api     (rebuilds the web against the public API)"
    Write-Host "  4. mobile\local.properties -> API_BASE_URL=$($api.Url)/api/   then rebuild the app"
    Write-Host "  5. Google Cloud Console -> web key -> allowed websites: add $($web.Url)/*"
    Write-Host ''
    Write-Host 'Keep this window open. Press Ctrl+C or close it to stop the tunnels.' -ForegroundColor Cyan
    Wait-Process -Id $api.Process.Id
} finally {
    foreach ($t in $tunnels) { Stop-Process -Id $t.Process.Id -Force -ErrorAction SilentlyContinue }
}
