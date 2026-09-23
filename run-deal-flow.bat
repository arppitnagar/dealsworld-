@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM DealsWorld - End-to-End Runner
REM Starts: Backend API + Admin portal (approvals)
REM         + Seller app (create/publish deals)
REM         + Buyer app (view/join deals)
REM Run this from the repo root (or double-click it there).
REM ============================================================

REM ============================================================
REM  Prefer to run just ONE app instead of the full stack below?
REM  Open a plain cmd window and copy the two/three lines for it.
REM ============================================================
REM
REM  Backend / API server
REM    Location: C:\Dev\DealsWorld\apps\backend
REM    cd /d C:\Dev\DealsWorld\apps\backend
REM    npm run dev
REM
REM  Admin portal (web - deal/seller approvals)
REM    Location: C:\Dev\DealsWorld\apps\admin
REM    cd /d C:\Dev\DealsWorld\apps\admin
REM    npm run admin:web -- --port 8082
REM
REM  Seller app (Expo Go on your phone - create/publish deals)
REM    Location: C:\Dev\DealsWorld\apps\seller
REM    cd /d C:\Dev\DealsWorld\apps\seller
REM    set EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:5000/api
REM    npm start -- --host lan --port 8084
REM
REM  Buyer app (Expo Go on your phone - view/join deals)
REM    Location: C:\Dev\DealsWorld\apps\buyer
REM    cd /d C:\Dev\DealsWorld\apps\buyer
REM    set EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:5000/api
REM    npm start -- --host lan --port 8083
REM
REM  Notes:
REM   - Replace YOUR_LAN_IP with this PC's LAN IPv4 (run `ipconfig`,
REM     look for "IPv4 Address") - it must be on the same Wi-Fi as
REM     your phone. Skip the "set EXPO_PUBLIC_API_BASE_URL" line
REM     entirely if you're only using the web Admin portal.
REM   - Start the backend first - the buyer/seller apps have nothing
REM     to load until http://127.0.0.1:5000/api/health responds.
REM   - Each "set"/"npm start" pair must run in the SAME cmd window
REM     (the env var only applies to that session), one app per window.
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
    echo Using it automatically - if it's wrong, close everything, edit
    echo EXPO_PUBLIC_API_BASE_URL below, and re-run.
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
    echo Continuing anyway - the mobile apps will retry once it's up.
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

REM --- 8) Start Typesense (search) via Docker, if it's set up ---
REM     One-time setup only (not done by this script): install Docker Desktop,
REM     then run the `docker run ... typesense/typesense` command from
REM     apps\backend\TYPESENSE_SETUP.md once to create the container and put
REM     its API key into apps\backend\.env. After that, this step just starts
REM     the already-created container each time you run this script.
REM
REM     Deliberately LAST and in its own self-closing window (start ... cmd
REM     /c, not /k) - two earlier attempts to run this inline (synchronously,
REM     then via start /b) both hung indefinitely on this machine for reasons
REM     that were never fully pinned down, silently blocking Admin/Seller/
REM     Buyer below from ever starting. Using the exact same start "Title"
REM     cmd ... mechanism already proven reliable for those four windows,
REM     placed after all of them, means even if this one hangs or fails, it
REM     can never again block anything the deal flow actually needs.
where docker >nul 2>nul
if !ERRORLEVEL! equ 0 (
    echo Starting Typesense (search) - check http://localhost:8108/health
    start "DealsWorld - Typesense (search)" cmd /c "docker start typesense"
) else (
    echo [INFO] Docker not found - skipping Typesense. Buyer search will show
    echo        "temporarily unavailable" until it's set up ^(optional^).
)

echo.
echo ============================================================
echo  Four windows are now starting (plus Typesense, if it's set up):
echo    1. Backend    -^> http://127.0.0.1:5000/api/health
echo    2. Admin      -^> http://localhost:8082 (opens in your browser)
echo    3. Seller app -^> scan the QR code with Expo Go
echo    4. Buyer app  -^> scan the QR code with Expo Go
echo    Typesense (search) -^> http://localhost:8108/health, optional -
echo    see apps\backend\TYPESENSE_SETUP.md if it showed [INFO] above.
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
