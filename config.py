import socket
import os
from dotenv import load_dotenv

# Detect the correct environment
current_dir = os.getcwd()

if 'Sydney_test' in current_dir:
    env_file = '.env.test'
elif 'Sydney_prod' in current_dir:
    env_file = '.env.prod'
else:
    raise Exception("Unknown environment. Please run in the correct folder.")

# Load the appropriate .env file
env_path = os.path.join(current_dir, env_file)
load_dotenv(env_path)

# Get local network IP dynamically
hostname = socket.gethostname()
local_ip = "10.0.0.80"  #Hardcoded static IP


# Get environment variables
ENV = os.getenv('ENV', 'test')
PORT = int(os.getenv('PORT', 4003))  # Default to test backend port
FRONTEND_PORT = 4004 if ENV == 'test' else 4001
BASE_URL = os.getenv('BASE_URL', f'http://10.0.0.80:{PORT}')
DB_NAME = os.getenv('DB_NAME', 'sydney.db')

print(f"Loaded environment: {ENV}")
print(f"Backend running on: {BASE_URL}")
print(f"Frontend should use: http://{local_ip}:{FRONTEND_PORT}")
