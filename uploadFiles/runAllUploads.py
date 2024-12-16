import subprocess

# List of Python files to run in order
scripts = [
    "uploadPlayer.py",
    "uploadDefense.py",
    "uploadPlayerAverages.py",
    "uploadDefenseAverage.py",
    "uploadAllDefenseAVG.py"
]

# Iterate through the scripts and execute them
for script in scripts:
    try:
        print(f"Running {script}...")
        subprocess.run(["python", script], check=True)
        print(f"{script} completed successfully.\n")
    except subprocess.CalledProcessError as e:
        print(f"Error occurred while running {script}: {e}")
        break
    except FileNotFoundError:
        print(f"Script {script} not found. Please check the file name and location.")
        break

print("Script execution complete.")
