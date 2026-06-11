@echo off
title Quan Ly Hoa Don - Localhost
echo ========================================
echo   Dang khoi dong server...
echo ========================================
echo.

REM Start npm dev in a new window
start "Server" cmd /c "npm run dev"

REM Wait a bit for server to start
timeout /t 3 /nobreak >nul

REM Open browser
start http://localhost:3000

echo.
echo Server is running at: http://localhost:3000
echo Press any key to exit this window...
pause >nul
