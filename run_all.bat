@echo off
REM ------------------------------------------------------------
REM AI-Based Police and Citizen Interaction - Run Script
REM ------------------------------------------------------------

REM Capture environment details
SET LOG_DIR=%~dp0logs
IF NOT EXIST "%LOG_DIR%" mkdir "%LOG_DIR%"

REM Record system info
python --version > "%LOG_DIR%\system_info.txt"
node --version >> "%LOG_DIR%\system_info.txt"
npm --version >> "%LOG_DIR%\system_info.txt"
pip freeze >> "%LOG_DIR%\system_info.txt"

REM Activate virtual environment if present
IF EXIST "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) ELSE (
    echo No virtual environment found. Ensure dependencies are installed globally or create one.
)

REM Run Django backend
start "Backend Server" cmd /c "python manage.py migrate && python manage.py runserver" > "%LOG_DIR%\backend_log.txt" 2>&1

REM Run React frontend
cd src
IF NOT EXIST "node_modules" (
    echo Installing npm dependencies...
    npm install > "%LOG_DIR%\frontend_install_log.txt" 2>&1
)
start "Frontend Server" cmd /c "npm start" > "%LOG_DIR%\frontend_log.txt" 2>&1

echo All services started. Logs are available in the 'logs' folder.
pause
