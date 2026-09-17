@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM DealsWorld - End-to-End Runner
REM Starts: Backend API + Admin portal (approvals)
REM         + Seller app (create/publish deals)
REM         + Buyer app (view/join deals)
REM Run this from the repo root (or double-click it there).
REM ============================================================

cd /d "%~dp0"

echo.
echo ============================================================
echo  DealsWorld - Starting full stack for the deal flow
echo ============================================================
echo.

REM --- 1) Detect a LAN IPv4 address (first match found) ---
set "LAN_IP="
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /R /C:"IPv4 Address"') do (
    if not defined LAN_IP (
        set "IP_CANDIDATE=%%A"
        set "LAN_IP=!IP_CANDIDATE: =!"
    )
)

if not defined LAN_IP (
    echo Could not auto-detect your LAN IPv4 address.
    set /p LAN_IP=Enter your PC's LAN IP manually ^(e.g. 192.168.1.11^):
) else (
    echo Detected LAN IP: !LAN_IP!
    echo ^(This must be the IP your phone can reach - same Wi-Fi as this PC^)
    set /p CONFIRM_IP=Press Enter to use it, or type a different IP:
    if not "!CONFIRM_IP!"=="" set "LAN_IP=!CONFIRM_IP!"
)

set "EXPO_PUBLIC_API_BASE_URL=http://!LAN_IP!:5000/api"
echo Using API base URL: !EXPO_PUBLIC_API_BASE_URL!
echo.

REM --- 2) Sanity check backend Firebase credentials ---
if not exist "apps\backend\serviceAccountKey.json" (
    echo [WARNING] apps\backend\serviceAccountKey.json is missing.
    echo The backend will fail to start without Firebase Admin credentials.
    echo.
    pause
)

REM --- 3) Start backend API in its own window ---
call :KillPort 5000
echo Starting backend on http://127.0.0.1:5000 ...
start "DealsWorld - Backend" cmd /k "cd /d "%CD%\apps\backend" && npm run dev"

REM --- 4) Wait for backend health check before launching mobile apps ---
echo Waiting for backend to respond on /api/health ...
set "BACKEND_READY=0"
for /l %%i in (1,1,25) do (
    if "!BACKEND_READY!"=="0" (
        curl -s -o "%TEMP%\dw_health.txt" -w "%%{http_code}" http://127.0.0.1:5000/api/health > "%TEMP%\dw_health_code.txt" 2>nul
        set /p HEALTH_CODE=<"%TEMP%\dw_health_code.txt"
        if "!HEALTH_CODE!"=="200" (
            set "BACKEND_READY=1"
            echo Backend is up.
        ) else (
            "%SystemRoot%\System32\timeout.exe" /t 1 /nobreak >nul
        )
    )
)
if "!BACKEND_READY!"=="0" (
    echo [WARNING] Backend did not respond after ~25s.
    echo Check the "DealsWorld - Backend" window for errors.
    echo You can still continue - the mobile apps will retry once it's up.
    pause
)
echo.

REM --- 5) Start Admin portal (approvals) - web-only, opens in the browser ---
call :KillPort 8082
echo Starting Admin portal - web on http://localhost:8082 ...
start "DealsWorld - Admin (approvals)" cmd /k "cd /d "%CD%" && npm run admin:web:fast"

REM --- 6) Start Seller app (used to create + publish deals) ---
call :KillPort 8084
echo Starting Seller app ^(SellerBuddy^) - Expo port 8084 ...
start "DealsWorld - Seller (create/publish deals)" cmd /k "cd /d "%CD%" && npm run seller:mobile"

REM --- 7) Start Buyer app (used to view + join deals) ---
call :KillPort 8083
echo Starting Buyer app ^(DealBuddy^) - Expo port 8083 ...
start "DealsWorld - Buyer (view/join deals)" cmd /k "cd /d "%CD%" && npm run buyer:mobile"

echo.
echo ============================================================
echo  Four windows are now starting:
echo    1. Backend    -^> http://127.0.0.1:5000/api/health
echo    2. Admin      -^> http://localhost:8082 (opens in your browser)
echo    3. Seller app -^> scan the QR code with Expo Go
echo    4. Buyer app  -^> scan the QR code with Expo Go
echo.
echo  On your phone: install "Expo Go" and make sure it's on the
echo  SAME Wi-Fi network as this PC before scanning either QR code.
echo.
echo  End-to-end deal flow to test:
echo    1. Seller app  -^> log in / sign up as a seller
echo                    -^> Create Deal -^> fill in details -^> Publish
echo    2. Buyer app   -^> log in / sign up as a buyer
echo                    -^> pull to refresh on Home
echo                    -^> the new deal appears -^> tap it to view
echo                       details, chat, and join
echo    3. Admin portal -^> log in as admin to review/approve deals
echo                        and sellers if your flow needs it
echo ============================================================
echo.
pause
endlocal
goto :EOF

REM --- Stops whatever is already LISTENING on the given port, if anything.
REM     Lets this script be re-run safely without hitting EADDRINUSE from a
REM     previous run's server that's still up. ---
:KillPort
set "KP_PORT=%~1"
set "KP_FOUND=0"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%KP_PORT% .*LISTENING"') do (
    set "KP_FOUND=1"
    echo Stopping existing process on port %KP_PORT%, PID %%P...
    taskkill /PID %%P /F >nul 2>&1
)
if "%KP_FOUND%"=="1" "%SystemRoot%\System32\timeout.exe" /t 1 /nobreak >nul
exit /b
