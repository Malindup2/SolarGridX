@echo off
rem Opens public HTTPS tunnels to the IIS-hosted API and web app. Needs cloudflared.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-tunnels.ps1" %*
