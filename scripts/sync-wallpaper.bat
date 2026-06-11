@echo off
echo ==========================================================
echo [SYNC] Dang dong bo hoa tu d:\desktop-dashboard
echo        sang Wallpaper Engine...
echo ==========================================================

robocopy d:\desktop-dashboard "C:\Program Files (x86)\Steam\steamapps\common\wallpaper_engine\projects\myprojects\desktopbaobo" /MIR /XD .git

rem Robocopy exit codes: 0 to 8 are success statuses. 
rem Note: Avoid parentheses in echo inside if-else blocks!
if %errorlevel% leq 8 (
    echo [SYNC] Dong bo hoa hoan thanh thanh cong!
    exit /b 0
) else (
    echo [SYNC] Co loi xay ra trong qua trinh dong bo. Ma loi: %errorlevel%
    exit /b %errorlevel%
)
