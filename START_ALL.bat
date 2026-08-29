@echo off
title PakVerify - Launching All Services
echo =====================================================
echo       PakVerify - AI Police Verification Portal
echo =====================================================
echo.

SET VENV_PYTHON=d:\AI_Based_Police_and_Citizen_Interaction\.venv\Scripts\python.exe
SET ROOT=d:\AI_Based_Police_and_Citizen_Interaction

echo [1/3] Starting Django Backend on port 8000...
start "Django Backend (port 8000)" cmd /k "%VENV_PYTHON% %ROOT%\backend\manage.py migrate & %VENV_PYTHON% %ROOT%\backend\manage.py runserver 8000"

timeout /t 5 /nobreak >nul

echo [2/3] Starting AI Microservice on port 8001...
start "AI Microservice (port 8001)" cmd /k "cd /d %ROOT%\ai_microservice & %VENV_PYTHON% main.py"

timeout /t 3 /nobreak >nul

echo [3/3] Starting React Frontend on port 5173...
start "React Frontend (port 5173)" cmd /k "cd /d %ROOT% & npm run dev"

echo.
echo =====================================================
echo  All services are launching in separate windows!
echo =====================================================
echo.
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:8000/api/
echo   AI API   : http://localhost:8001/health
echo   Swagger  : http://localhost:8000/api/schema/swagger-ui/
echo.
echo  Wait 10-15 seconds for all services to fully start.
echo =====================================================
pause
