#!/usr/bin/env python3
"""
Unified NFL Data Upload Script
Runs all upload scripts in the correct dependency order with easy week configuration.
"""

import subprocess
import sys
import os
from datetime import datetime
from typing import List, Dict, Optional
import argparse
from config import get_current_week, DEFAULT_CONFIG, WEEK_DEPENDENT_SCRIPTS, PHASES

# Get independent scripts from phases
INDEPENDENT_SCRIPTS = []
for phase_info in PHASES.values():
    INDEPENDENT_SCRIPTS.extend(phase_info['scripts'])
# Remove duplicates and week-dependent scripts
INDEPENDENT_SCRIPTS = list(set(INDEPENDENT_SCRIPTS) - set(WEEK_DEPENDENT_SCRIPTS.keys()))

class UploadManager:
    def __init__(self, current_week: int = None, verbose: bool = None):
        self.current_week = current_week or get_current_week()
        self.verbose = verbose if verbose is not None else DEFAULT_CONFIG['verbose']
        self.failed_scripts = []
        self.successful_scripts = []
        
    def log(self, message: str, level: str = "INFO"):
        """Log messages with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        
    def run_script(self, script_name: str, week: Optional[int] = None) -> bool:
        """Run a single script with proper error handling"""
        self.log(f"Starting {script_name}...")
        
        try:
            # Check if script exists
            if not os.path.exists(script_name):
                self.log(f"Script {script_name} not found!", "ERROR")
                return False
                
            # Handle week-dependent scripts
            if script_name in WEEK_DEPENDENT_SCRIPTS:
                week_to_use = week or self.current_week
                self.log(f"Running {script_name} with week {week_to_use}")
                
                # Create input for scripts that require user input
                script_config = WEEK_DEPENDENT_SCRIPTS[script_name]
                
                # Check for CSV requirement
                if script_config.get('requires_csv', False):
                    csv_path = script_config.get('csv_path', "my-app/public/PlayerProps.csv")
                    if not os.path.exists(csv_path):
                        self.log(f"Required CSV file not found: {csv_path}", "WARNING")
                        self.log(f"Skipping {script_name} - CSV file required", "WARNING")
                        return False
                
                # Run script with input
                process = subprocess.Popen(
                    [sys.executable, script_name],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    encoding='utf-8',
                    errors='replace',
                    env=os.environ.copy()
                )
                
                stdout, stderr = process.communicate(input=str(week_to_use))
                
                if process.returncode == 0:
                    self.log(f"✅ {script_name} completed successfully")
                    if self.verbose and stdout:
                        print(f"Output: {stdout}")
                    return True
                else:
                    self.log(f"❌ {script_name} failed with return code {process.returncode}", "ERROR")
                    if stderr:
                        self.log(f"Error output: {stderr}", "ERROR")
                    return False
                    
            else:
                # Run independent scripts normally
                result = subprocess.run(
                    [sys.executable, script_name],
                    capture_output=True,
                    text=True,
                    encoding='utf-8',
                    errors='replace',
                    env=os.environ.copy(),
                    check=True
                )
                
                self.log(f"✅ {script_name} completed successfully")
                if self.verbose and result.stdout:
                    print(f"Output: {result.stdout}")
                return True
                
        except subprocess.CalledProcessError as e:
            self.log(f"❌ {script_name} failed: {e}", "ERROR")
            if e.stderr:
                self.log(f"Error output: {e.stderr}", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ Unexpected error running {script_name}: {e}", "ERROR")
            return False
    
    def run_all_uploads(self, skip_schedule: bool = True, skip_optional: bool = False) -> bool:
        """Run all upload scripts in the correct order"""
        self.log("🚀 Starting NFL Data Upload Process")
        self.log(f"Current Week: {self.current_week}")
        self.log("=" * 60)
        
        # Phase 1: Schedule Management (Foundation)
        if not skip_schedule:
            self.log("📅 Phase 1: Schedule Management")
            schedule_scripts = ['scrape_nfl_schedule.py', 'uploadMatchup.py']
            for script in schedule_scripts:
                if not self.run_script(script):
                    self.failed_scripts.append(script)
                    self.log(f"Stopping execution due to failure in {script}", "ERROR")
                    return False
                self.successful_scripts.append(script)
        else:
            self.log("⏭️ Skipping schedule management phase (one-time setup)")
        
        # Phase 2: Core Data Upload
        self.log("📊 Phase 2: Core Data Upload")
        core_scripts = ['uploadPlayerList.py', 'uploadPlayer.py', 'uploadDefense.py']
        for script in core_scripts:
            if not self.run_script(script):
                self.failed_scripts.append(script)
                self.log(f"Stopping execution due to failure in {script}", "ERROR")
                return False
            self.successful_scripts.append(script)
        
        # Phase 3: Calculated Averages
        self.log("🧮 Phase 3: Calculated Averages")
        average_scripts = ['uploadPlayerAverages.py', 'uploadDefenseAverage.py', 'uploadAllDefenseAVG.py']
        for script in average_scripts:
            if not self.run_script(script):
                self.failed_scripts.append(script)
                self.log(f"Stopping execution due to failure in {script}", "ERROR")
                return False
            self.successful_scripts.append(script)
        
        # Phase 4: Projections & Analysis
        self.log("🔮 Phase 4: Projections & Analysis")
        projection_scripts = ['uploadPlayerProjections.py', 'uploadMatchupRank.py']
        for script in projection_scripts:
            if not self.run_script(script):
                self.failed_scripts.append(script)
                self.log(f"Stopping execution due to failure in {script}", "ERROR")
                return False
            self.successful_scripts.append(script)
        
        # Phase 5: Optional/Weekly Data
        if not skip_optional:
            self.log("📈 Phase 5: Optional/Weekly Data")
            optional_scripts = ['uploadPlayerLines.py', 'uploadPlayerRecent.py']
            for script in optional_scripts:
                if not self.run_script(script):
                    self.log(f"⚠️ {script} failed, but continuing with other scripts", "WARNING")
                    self.failed_scripts.append(script)
                else:
                    self.successful_scripts.append(script)
        else:
            self.log("⏭️ Skipping optional data phase")
        
        # Summary
        self.log("=" * 60)
        self.log("📋 Upload Summary:")
        self.log(f"✅ Successful: {len(self.successful_scripts)} scripts")
        self.log(f"❌ Failed: {len(self.failed_scripts)} scripts")
        
        if self.successful_scripts:
            self.log("Successful scripts:")
            for script in self.successful_scripts:
                self.log(f"  ✅ {script}")
        
        if self.failed_scripts:
            self.log("Failed scripts:")
            for script in self.failed_scripts:
                self.log(f"  ❌ {script}")
        
        return len(self.failed_scripts) == 0
    
    def run_specific_phase(self, phase: str) -> bool:
        """Run a specific phase of uploads"""
        if phase not in PHASES:
            self.log(f"Unknown phase: {phase}. Available phases: {list(PHASES.keys())}", "ERROR")
            return False
        
        phase_info = PHASES[phase]
        self.log(f"🎯 Running {phase} phase: {phase_info['description']}")
        scripts = phase_info['scripts']
        
        for script in scripts:
            if not self.run_script(script):
                self.failed_scripts.append(script)
                return False
            self.successful_scripts.append(script)
        
        return True

def main():
    # Set UTF-8 encoding for Windows console and environment
    if sys.platform == "win32":
        import codecs
        sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
        sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())
        # Set environment variable for subprocesses
        os.environ['PYTHONIOENCODING'] = 'utf-8'
    
    parser = argparse.ArgumentParser(description='Unified NFL Data Upload Script')
    parser.add_argument('--week', '-w', type=int, default=None, 
                       help=f'Current NFL week (default: {get_current_week()})')
    parser.add_argument('--phase', '-p', type=str, 
                       choices=list(PHASES.keys()),
                       help='Run only a specific phase')
    parser.add_argument('--include-schedule', action='store_true',
                       help='Include schedule management phase (normally skipped as one-time setup)')
    parser.add_argument('--skip-optional', action='store_true',
                       help='Skip optional/weekly data phase')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose output')
    
    args = parser.parse_args()
    
    # Use provided week or default from config
    week = args.week or get_current_week()
    
    # Validate week
    if week < 1 or week > 18:
        print("❌ Invalid week number. Must be between 1 and 18.")
        sys.exit(1)
    
    # Create upload manager
    manager = UploadManager(current_week=week, verbose=args.verbose)
    
    try:
        if args.phase:
            success = manager.run_specific_phase(args.phase)
        else:
            success = manager.run_all_uploads(
                skip_schedule=not args.include_schedule,
                skip_optional=args.skip_optional
            )
        
        if success:
            print("\n🎉 All uploads completed successfully!")
            sys.exit(0)
        else:
            print("\n💥 Some uploads failed. Check the logs above.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⏹️ Upload process interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
