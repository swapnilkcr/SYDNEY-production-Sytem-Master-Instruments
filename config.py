import os
import socket
import subprocess
from dotenv import load_dotenv

# --- Detect current git branch ---
def get_git_branch():
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            stderr=subprocess.DEVNULL
        ).decode().strip()
    except Exception:
        return "develop"  # fallback

branch = get_git_branch()

# --- Map branch → environment ---
if branch == "main":
    APP_ENV = "prod"
    env_file = ".env.prod"
else:
    APP_ENV = "develop"
    env_file = ".env.develop"

# --- Load env file ---
if os.path.exists(env_file):
    load_dotenv(env_file)

# --- Local IP ---
local_ip = "10.0.0.80"

# --- Backend ports & DB ---
ENV = os.getenv("ENV", APP_ENV)
PORT = int(os.getenv("PORT", 4003 if APP_ENV == "develop" else 4000))
FRONTEND_PORT = 4004 if APP_ENV == "develop" else 4001
DB_NAME = os.getenv("DB_NAME", "sydney_dev.db" if APP_ENV == "develop" else "sydney_prod.db")

# --- Build BASE_URL ---
BASE_URL = os.getenv("BASE_URL", f"http://{local_ip}:{PORT}")

print(f"Loaded environment: {ENV} (branch: {branch})")
print(f"Backend running on: {BASE_URL}")
print(f"Frontend should use: http://{local_ip}:{FRONTEND_PORT}")
print(f"Database file in use: {DB_NAME}")
