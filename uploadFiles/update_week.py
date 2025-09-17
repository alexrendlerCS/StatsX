#!/usr/bin/env python3
"""
Simple script to update the current week in the configuration
Usage: python update_week.py [week_number]
"""

import sys
import os
from config import update_current_week, get_current_week

def main():
    # Set UTF-8 encoding for Windows console
    if sys.platform == "win32":
        import codecs
        sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
        sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())
    
    if len(sys.argv) > 1:
        try:
            new_week = int(sys.argv[1])
            if not (1 <= new_week <= 18):
                print("❌ Week must be between 1 and 18")
                sys.exit(1)
            
            current_week = get_current_week()
            print(f"Current week: {current_week}")
            print(f"Updating to week: {new_week}")
            
            update_current_week(new_week)
            print(f"✅ Successfully updated current week to {new_week}")
            print(f"💡 You can now run: python run_all_uploads.py")
            
        except ValueError:
            print("❌ Please provide a valid week number (1-18)")
            sys.exit(1)
    else:
        current_week = get_current_week()
        print(f"Current week: {current_week}")
        print("Usage: python update_week.py [week_number]")
        print("Example: python update_week.py 5")

if __name__ == "__main__":
    main()
