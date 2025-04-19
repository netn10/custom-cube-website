@echo off
echo Starting MTG Cube Website Servers...

:: Start the Flask backend server in a new window
start "MTG Cube Backend" cmd /k "cd backend && python app.py"

:: Wait a moment for the backend to initialize
timeout /t 3 /nobreak > nul

:: Start the Next.js frontend server in a new window
start "MTG Cube Frontend" cmd /k "npm run dev"

echo.
echo Both servers have been started in separate windows.
echo.
echo Backend URL: http://127.0.0.1:5000
echo Frontend URL: http://localhost:3000
echo.
echo Press any key to close this window. The servers will continue running in their own windows.
echo To stop the servers, close their respective command windows.
echo.
pause > nul
