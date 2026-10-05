@echo off
rem Double-click to redeploy the API to IIS. Asks for administrator rights.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-iis.ps1" %*
