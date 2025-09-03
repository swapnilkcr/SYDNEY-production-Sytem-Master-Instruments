import sqlite3
import datetime
import os

# Paths
source_db = r"S:\DATAPERTH\Perth Log Job system\Clock_In_test\app\clock_in_management.db"
backup_folder = r"S:\DATAPERTH\Perth Log Job system\Clock_In_test\app\backup"
os.makedirs(backup_folder, exist_ok=True)

# Timestamp for backup file
timestamp = datetime.datetime.now().strftime("%Y-%m-%d")
backup_db = os.path.join(backup_folder, f"clockin_backup_{timestamp}.db")

# Perform backup using SQLite's backup API
source_conn = sqlite3.connect(source_db)
backup_conn = sqlite3.connect(backup_db)

with backup_conn:
    source_conn.backup(backup_conn)

source_conn.close()
backup_conn.close()
