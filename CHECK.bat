@echo off
cd /d "%~dp0"
node -v >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not in PATH. Please install Node.js 20 or newer.
  pause
  exit /b 1
)
npm run check
pause
