import sqlite3
import shutil
import os
from datetime import datetime

# Define database and backup folder
DB_FILE = "prod_management.db"
BACKUP_FOLDER = "db_backups"

# Ensure backup folder exists
if not os.path.exists(BACKUP_FOLDER):
    os.makedirs(BACKUP_FOLDER)

def backup_database():
    try:
        # Generate a timestamped backup filename
        backup_filename = os.path.join(BACKUP_FOLDER, f"backup_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.db")

        # Copy database to backup file
        shutil.copy(DB_FILE, backup_filename)

        print(f"Backup successful: {backup_filename}")
    except Exception as e:
        print(f"Backup failed: {e}")

if __name__ == "__main__":
    backup_database()
