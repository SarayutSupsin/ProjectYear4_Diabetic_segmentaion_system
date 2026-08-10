@echo off
echo ===================================================
echo        Mobile Tunnel Sharing Script (localtunnel)
echo ===================================================
echo.
echo Starting Frontend Tunnel (Port 5173)...
start "Frontend Tunnel (Port 5173)" cmd /k "npx -y localtunnel --port 5173 --subdomain dfu-segmentation-y4-frontend --local-host 127.0.0.1"

echo Starting Backend Tunnel (Port 8000)...
start "Backend Tunnel (Port 8000)" cmd /k "npx -y localtunnel --port 8000 --subdomain dfu-segmentation-y4-backend --local-host 127.0.0.1"

echo.
echo ---------------------------------------------------
echo [SUCCESS] Tunneling started successfully!
echo.
echo 🔗 Open this URL on your phone's browser:
echo    👉 https://dfu-segmentation-y4-frontend.loca.lt
echo ---------------------------------------------------
echo.
echo *NOTE: Keep the two popped-up command prompt windows open during presentation.*
echo.
pause
