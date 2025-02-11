# config.py

from dotenv import load_dotenv
import os

# Detect environment based on folder name
current_dir = os.getcwd()

if 'Clock_In_test' in current_dir:
    env_file = '.env.test'
elif 'Clock_In_prod' in current_dir:
    env_file = '.env.prod'
else:
    raise Exception("Unknown environment. Please run in the correct environment folder.")

# Load the appropriate .env file
env_path = os.path.join(current_dir, env_file)
print(f"Loading environment file: {env_path}")  # Debugging line

load_dotenv(env_path)

# Get environment variables
ENV = os.getenv('ENV', 'test')  # Default to test
PORT = int(os.getenv('PORT', 3003))  # Default port is 3000

# Debugging: Print environment details
print(f"Loaded environment: {ENV}")
print(f"Running on port: {PORT}")
