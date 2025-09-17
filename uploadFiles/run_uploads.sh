#!/bin/bash
# Shell script to run NFL data uploads
# Usage: ./run_uploads.sh [week_number]

if [ $# -eq 0 ]; then
    echo "Running uploads with default week from config..."
    python3 run_all_uploads.py
else
    echo "Running uploads for week $1..."
    python3 run_all_uploads.py --week "$1"
fi
