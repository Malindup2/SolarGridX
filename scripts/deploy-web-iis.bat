@echo off
rem Double-click to build the web app and deploy it to IIS. Asks for administrator rights.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-web-iis.ps1" %*
