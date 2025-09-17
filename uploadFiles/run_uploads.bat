@echo off
REM Windows batch file to run NFL data uploads
REM Usage: run_uploads.bat [week_number]

if "%1"=="" (
    echo Running uploads with default week from config...
    python run_all_uploads.py
) else (
    echo Running uploads for week %1...
    python run_all_uploads.py --week %1
)

pause
