@echo off
echo ===================================================
echo   MTG Cube Website Server Manager
echo ===================================================
echo.

echo [1/4] Killing existing processes...
echo.

:: Kill any existing Python processes (backend)
taskkill /f /im python.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo - Successfully terminated Python processes.
) else (
    echo - No Python processes found or unable to terminate them.
)

:: Kill any existing Node.js processes (frontend)
taskkill /f /im node.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo - Successfully terminated Node.js processes.
) else (
    echo - No Node.js processes found or unable to terminate them.
)

echo.
echo [2/4] Waiting for processes to fully terminate...
timeout /t 3 /nobreak > nul

echo.
echo [3/4] Starting backend server...
start "MTG Cube Backend" cmd /k "cd backend && python app.py"

echo.
echo [4/4] Starting frontend server...
echo Waiting for backend to initialize...
timeout /t 3 /nobreak > nul
start "MTG Cube Frontend" cmd /k "npm run dev"

echo.
echo ===================================================
echo   Servers started successfully!
echo ===================================================
echo.
echo Backend URL: http://127.0.0.1:5000
echo Frontend URL: http://localhost:3000
echo.
echo Press any key to close this window. The servers will
echo continue running in their own windows.
echo.
echo To stop the servers, close their respective command
echo windows or run this script again to restart them.
echo ===================================================
echo.
pause > nul
