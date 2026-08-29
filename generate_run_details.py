"""generate_run_details.py

This script collects and writes essential runtime information for the AI-Based Police and Citizen Interaction project.
It is intended to be executed before starting the servers (or as part of the run_all.bat script).
"""
import os, sys, subprocess, json, platform
from datetime import datetime

def run_cmd(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout.strip()

info = {
    "timestamp": datetime.now().isoformat(),
    "platform": platform.platform(),
    "python_version": sys.version.split()[0],
    "node_version": run_cmd('node --version'),
    "npm_version": run_cmd('npm --version'),
    "pip_freeze": run_cmd('pip freeze'),
    "installed_packages": run_cmd('pip list --format=json'),
    "git_commit": run_cmd('git rev-parse HEAD') if os.path.isdir('.git') else 'N/A',
    "project_root": os.path.abspath(os.path.dirname(__file__)),
    "requirements_file": os.path.abspath('backend/requirements.txt'),
}

log_dir = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'logs')
os.makedirs(log_dir, exist_ok=True)
log_path = os.path.join(log_dir, 'run_details.json')
with open(log_path, 'w', encoding='utf-8') as f:
    json.dump(info, f, indent=2)
print(f"Run details written to {log_path}")
