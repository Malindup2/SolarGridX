<#
  deploy-web-iis.ps1
  One-step deploy of the web app to IIS: builds the React app against the hosted API, writes a
  web.config so links like /login and /stations open the app, creates the IIS site if it is
  missing, copies the build and checks the result. Asks for administrator rights itself.

  Usage:  double-click scripts\deploy-web-iis.bat
          or  powershell -File scripts\deploy-web-iis.ps1
  Test without touching IIS:  scripts\deploy-web-iis.ps1 -DryRun
#>
param(
    [string]$SiteName = 'SolarGridX_Web',
    [string]$PoolName = 'SolarGridX_WebPool',
    [string]$SiteFolder = 'C:\inetpub\wwwroot\SolarGridX_Web',
    [int]$Port = 8091,
    [string]$ApiUrl = 'http://localhost:8090/api',
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Write-Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }
function Write-Ok($text)   { Write-Host "    OK  $text" -ForegroundColor Green }
function Write-Warn($text) { Write-Host "    ..  $text" -ForegroundColor Yellow }
function Write-Bad($text)  { Write-Host "    !!  $text" -ForegroundColor Red }

function Finish($code) {
    Write-Host ''
    Read-Host 'Press Enter to close'
    exit $code
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
           ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin -and -not $DryRun) {
    Write-Host 'Administrator rights are needed. Accept the Windows prompt...' -ForegroundColor Yellow
    $argList = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -SiteName $SiteName -PoolName $PoolName -SiteFolder `"$SiteFolder`" -Port $Port -ApiUrl $ApiUrl"
    Start-Process powershell -Verb RunAs -ArgumentList $argList
    exit 0
}

# With URL Rewrite, any unknown path returns the app. Without it, a custom 404 page does the same job.
$rewriteConfig = @'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <remove fileExtension=".webmanifest" />
      <mimeMap fileExtension=".webmanifest" mimeType="application/manifest+json" />
    </staticContent>
  </system.webServer>
</configuration>
'@

$fallbackConfig = @'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <httpErrors errorMode="Custom" existingResponse="Replace">
      <remove statusCode="404" />
      <error statusCode="404" path="/index.html" responseMode="ExecuteURL" />
    </httpErrors>
    <staticContent>
      <remove fileExtension=".webmanifest" />
      <mimeMap fileExtension=".webmanifest" mimeType="application/manifest+json" />
    </staticContent>
  </system.webServer>
</configuration>
'@

try {
    $repoRoot = Split-Path -Parent $PSScriptRoot
    $webRoot  = Join-Path $repoRoot 'web'
    if (-not (Test-Path (Join-Path $webRoot 'package.json'))) { throw "Cannot find the web project in $webRoot" }
    $origin = "http://localhost:$Port"
    $target = if ($DryRun) { Join-Path $env:TEMP 'solargridx-web-dryrun' } else { $SiteFolder }

    Write-Step 'Checking the API will accept this site'
    $devSettings = Join-Path $repoRoot 'api\appsettings.Development.json'
    if (Test-Path $devSettings) {
        $raw = Get-Content $devSettings -Raw
        if ($raw -match [regex]::Escape($origin)) {
            Write-Ok "CORS already lists $origin"
        } else {
            Write-Warn "api\appsettings.Development.json does not list $origin under Cors:AllowedOrigins."
            Write-Warn 'Add it, then run scripts\deploy-iis.bat, or the browser will block calls to the API.'
        }
    }

    Write-Step "Building the web app (API: $ApiUrl)"
    Push-Location $webRoot
    try {
        if (-not (Test-Path 'node_modules')) {
            npm install --no-audit --no-fund
            if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }
        }
        $env:VITE_API_BASE_URL = $ApiUrl
        npm run build
        if ($LASTEXITCODE -ne 0) { throw 'npm run build failed (see the errors above).' }
    } finally {
        Remove-Item Env:\VITE_API_BASE_URL -ErrorAction SilentlyContinue
        Pop-Location
    }
    $dist = Join-Path $webRoot 'dist'
    if (-not (Test-Path (Join-Path $dist 'index.html'))) { throw 'The build produced no index.html.' }
    Write-Ok 'built'

    Write-Step 'Choosing the route fallback'
    $rewriteDll = @(
        (Join-Path $env:windir 'System32\inetsrv\rewrite.dll'),
        (Join-Path $env:ProgramFiles 'IIS\URL Rewrite\rewrite.dll')
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($rewriteDll) {
        $config = $rewriteConfig
        Write-Ok 'URL Rewrite found: using a rewrite rule'
    } else {
        $config = $fallbackConfig
        Write-Warn 'URL Rewrite is not installed: using a custom 404 page instead (works, but installing URL Rewrite is cleaner).'
    }

    Write-Step "Copying the build to $target"
    New-Item -ItemType Directory -Force $target | Out-Null
    robocopy $dist $target /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy failed with code $LASTEXITCODE" }
    Set-Content -Path (Join-Path $target 'web.config') -Value $config -Encoding UTF8
    Write-Ok 'copied, web.config written'

    if ($DryRun) {
        Write-Host "`nDry run finished. Files are in $target. IIS was not touched." -ForegroundColor Yellow
        Get-ChildItem $target | Select-Object -First 8 Name | Format-Table -HideTableHeaders
        Remove-Item $target -Recurse -Force -ErrorAction SilentlyContinue
        Finish 0
    }

    Write-Step 'Setting up the IIS site'
    try { Import-Module WebAdministration } catch {
        throw 'IIS is not installed on this machine. Set it up first (README 8.1).'
    }
    if (-not (Test-Path "IIS:\AppPools\$PoolName")) {
        New-WebAppPool -Name $PoolName | Out-Null
        Write-Ok "created app pool $PoolName"
    }
    # A static site needs no .NET runtime in its worker.
    Set-ItemProperty "IIS:\AppPools\$PoolName" -Name managedRuntimeVersion -Value ''
    if (-not (Get-Website -Name $SiteName)) {
        New-Website -Name $SiteName -Port $Port -PhysicalPath $target -ApplicationPool $PoolName | Out-Null
        Write-Ok "created site $SiteName on port $Port"
    } else {
        Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $target
        Write-Ok "site $SiteName already exists"
    }
    if ((Get-WebAppPoolState $PoolName).Value -ne 'Started') { Start-WebAppPool $PoolName }
    if ((Get-WebsiteState $SiteName).Value -ne 'Started') { Start-Website $SiteName }

    Write-Step 'Checking the site'
    $failed = $false
    foreach ($path in '/', '/login') {
        try {
            $r = Invoke-WebRequest "$origin$path" -UseBasicParsing -TimeoutSec 20
            if ($r.StatusCode -eq 200 -and $r.Content -match 'id="root"') { Write-Ok "$origin$path opens the app" }
            else { Write-Bad "$origin$path answered but is not the app (status $($r.StatusCode))"; $failed = $true }
        } catch {
            Write-Bad "$origin$path failed: $($_.Exception.Message)"
            $failed = $true
        }
    }
    if ($failed) { Finish 1 }

    Write-Host "`nWeb app is live at $origin" -ForegroundColor Green
    Write-Host "Google Maps key: allow $origin/* under the web key's website restrictions." -ForegroundColor Yellow
    Finish 0
} catch {
    Write-Bad $_.Exception.Message
    Finish 1
}
