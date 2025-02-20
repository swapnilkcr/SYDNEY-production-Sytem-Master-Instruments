import sqlite3
import datetime
import os

DB_PATH = 'S:\\USERDATA\Swapnil\\MI_clockin_out\\Clock_In_prod\\prod_app\\prod_management.db'  # Adjust path to your actual DB
BACKUP_DIR = 's:\\USERDATA\\Swapnil\\MI_clockin_out\\Clock_In_prod\\db_backup'  # Backup directory

# Ensure backup directory exists
os.makedirs(BACKUP_DIR, exist_ok=True)

def backup_database():
    timestamp = datetime.datetime.now().strftime('%Y-%m-%d')
    backup_file = os.path.join(BACKUP_DIR, f'prod_db_backup_{timestamp}.db')

    try:
        with sqlite3.connect(DB_PATH) as conn:
            with sqlite3.connect(backup_file) as backup_conn:
                conn.backup(backup_conn)
        print(f"✅ Backup successful: {backup_file}")
    except Exception as e:
        print(f"❌ Backup failed: {str(e)}")

if __name__ == "__main__":
    backup_database()
