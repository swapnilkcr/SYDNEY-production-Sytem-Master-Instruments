import sqlite3

# Create a connection to the SQLite database (it will create the file if it doesn't exist)
conn = sqlite3.connect('clock_in_management.db')
cursor = conn.cursor()

# Create the table to store clock-in/clock-out data
cursor.execute('''
CREATE TABLE IF NOT EXISTS ClockInOut (
    RecordID INTEGER PRIMARY KEY AUTOINCREMENT,
    StaffName TEXT,
    JobID TEXT,
    start_time TIMESTAMP,
    stop_time TIMESTAMP,
    status TEXT CHECK(status IN ('active', 'completed')) DEFAULT 'active'
)
''')

# Commit the changes and close the connection
conn.commit()
conn.close()

print("Database initialized successfully!")

