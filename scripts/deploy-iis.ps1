<#
  deploy-iis.ps1
  One-step redeploy of the API to IIS. Asks for administrator rights itself,
  stops the app pool, publishes, starts the pool again and checks the result.

  Usage:  double-click scripts\deploy-iis.bat
          or  powershell -File scripts\deploy-iis.ps1
  Test without touching IIS:  scripts\deploy-iis.ps1 -DryRun
#>
param(
    [string]$SiteName = 'SolarGridX_API',
    [string]$PoolName = 'SolarGridX_Pool',
    [string]$SiteFolder = 'C:\inetpub\wwwroot\SolarGridX_API',
    [int]$Port = 8090,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$script:wasRunning = @()

function Write-Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }
function Write-Ok($text)   { Write-Host "    OK  $text" -ForegroundColor Green }
function Write-Bad($text)  { Write-Host "    !!  $text" -ForegroundColor Red }

function Finish($code) {
    Write-Host ''
    Read-Host 'Press Enter to close'
    exit $code
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
           ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# Publishing to C:\inetpub and stopping a pool both need administrator rights,
# so relaunch this same script elevated instead of making the user find that out.
if (-not $isAdmin -and -not $DryRun) {
    Write-Host 'Administrator rights are needed. Accept the Windows prompt...' -ForegroundColor Yellow
    $argList = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -SiteName $SiteName -PoolName $PoolName -SiteFolder `"$SiteFolder`" -Port $Port"
    Start-Process powershell -Verb RunAs -ArgumentList $argList
    exit 0
}

try {
    $repoRoot = Split-Path -Parent $PSScriptRoot
    $project  = Join-Path $repoRoot 'api\MicrogridApi.csproj'
    if (-not (Test-Path $project)) { throw "Cannot find $project" }

    $target = if ($DryRun) { Join-Path $env:TEMP 'solargridx-dryrun' } else { $SiteFolder }
    $baseUrl = "http://localhost:$Port"

    # The publish copies appsettings.Development.json, so IIS ends up on whatever
    # database that file names. Say which one, never the connection string.
    Write-Step 'Settings that will be deployed'
    $devSettings = Join-Path $repoRoot 'api\appsettings.Development.json'
    if (Test-Path $devSettings) {
        $json = Get-Content $devSettings -Raw | ConvertFrom-Json
        Write-Host "    Database : $($json.MongoDbSettings.DatabaseName)"
        Write-Host '    (change DatabaseName in api\appsettings.Development.json first if that is not the one you want)'
    } else {
        Write-Bad 'api\appsettings.Development.json is missing - the API will have no database settings'
    }

    if (-not $DryRun) {
        try { Import-Module WebAdministration } catch {
            throw 'IIS is not installed on this machine. This script redeploys to an existing IIS site; set it up first (README 8.1).'
        }
        if (-not (Test-Path "IIS:\AppPools\$PoolName")) {
            throw "App pool '$PoolName' does not exist. Create the IIS site first (README 8.4)."
        }
        if (-not (Get-Website -Name $SiteName)) {
            throw "Site '$SiteName' does not exist. Create the IIS site first (README 8.4)."
        }

        # The folder sits under C:\inetpub\wwwroot, so the Default Web Site can load the same
        # API from it in its own worker. Stopping only our pool leaves that worker holding the
        # DLL, so stop every pool that can serve this folder.
        $pools = New-Object System.Collections.Generic.List[string]
        $folderPath = $target.TrimEnd('\')
        $roots = @()
        $roots += Get-Website | ForEach-Object { [pscustomobject]@{ Root = $_.physicalPath; Pool = $_.applicationPool } }
        $roots += Get-WebApplication | ForEach-Object { [pscustomobject]@{ Root = $_.PhysicalPath; Pool = $_.applicationPool } }
        foreach ($r in $roots) {
            $root = [Environment]::ExpandEnvironmentVariables([string]$r.Root).TrimEnd('\')
            if ($root -and $folderPath.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and -not $pools.Contains($r.Pool)) {
                $pools.Add($r.Pool)
            }
        }
        if (-not $pools.Contains($PoolName)) { $pools.Add($PoolName) }

        Write-Step "Stopping app pools that can serve this folder: $($pools -join ', ')"
        foreach ($p in $pools) {
            if ((Get-WebAppPoolState $p).Value -ne 'Stopped') {
                $script:wasRunning += $p
                Stop-WebAppPool $p
            }
        }
        foreach ($p in $pools) {
            for ($i = 0; $i -lt 30 -and (Get-WebAppPoolState $p).Value -ne 'Stopped'; $i++) { Start-Sleep 1 }
            if ((Get-WebAppPoolState $p).Value -ne 'Stopped') { throw "The pool $p would not stop." }
        }
        Write-Ok 'pools stopped'

        # A worker can outlive the pool for a moment and keep the DLL locked.
        $dll = Join-Path $target 'MicrogridApi.dll'
        $unlocked = $false
        for ($i = 0; $i -lt 20 -and -not $unlocked; $i++) {
            try {
                if (Test-Path $dll) { [IO.File]::Open($dll, 'Open', 'ReadWrite', 'None').Close() }
                $unlocked = $true
            } catch {
                Start-Sleep 1
            }
        }
        if (-not $unlocked) {
            # Only stop workers that belong to the pools above, never unrelated sites.
            $pattern = ($pools | ForEach-Object { [regex]::Escape($_) }) -join '|'
            Get-CimInstance Win32_Process -Filter "Name='w3wp.exe'" |
                Where-Object { $_.CommandLine -match $pattern } |
                ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
            Start-Sleep 2
        }
    }

    Write-Step "Publishing to $target"
    dotnet publish $project -c Release -o $target --nologo -v q
    if ($LASTEXITCODE -ne 0) { throw 'dotnet publish failed (see the errors above).' }
    Write-Ok 'published'

    if ($DryRun) {
        Write-Host "`nDry run finished. Files are in $target. IIS was not touched." -ForegroundColor Yellow
        Remove-Item $target -Recurse -Force -ErrorAction SilentlyContinue
        Finish 0
    }

    Write-Step 'Starting app pools again'
    foreach ($p in ($script:wasRunning + $PoolName | Select-Object -Unique)) {
        Start-WebAppPool $p
        Write-Ok "$p started"
    }

    Write-Step 'Waiting for the API to answer'
    $healthy = $false
    for ($i = 0; $i -lt 40 -and -not $healthy; $i++) {
        try { $healthy = (Invoke-WebRequest "$baseUrl/health" -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200 }
        catch { Start-Sleep 2 }
    }
    if (-not $healthy) { throw "No answer from $baseUrl/health. Check stdout logging in web.config (README 8.6)." }
    Write-Ok "$baseUrl/health is up"

    Write-Step 'Checking the deployed build'
    $paths = (Invoke-RestMethod "$baseUrl/swagger/v1/swagger.json").paths.PSObject.Properties
    $count = ($paths | ForEach-Object { $_.Value.PSObject.Properties.Count } | Measure-Object -Sum).Sum
    if ($count -lt 40) { throw "Only $count endpoints are live - an old build is still being served." }
    Write-Ok "$count endpoints live"

    Write-Host "`nDone. Swagger: $baseUrl/swagger" -ForegroundColor Green
    Finish 0
}
catch {
    Write-Bad $_.Exception.Message
    # Never leave the site down because a step failed.
    if (-not $DryRun) {
        foreach ($p in ($script:wasRunning + $PoolName | Select-Object -Unique)) {
            try { Start-WebAppPool $p -ErrorAction SilentlyContinue } catch { }
        }
    }
    Finish 1
}
