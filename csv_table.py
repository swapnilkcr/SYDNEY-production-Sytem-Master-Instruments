import sqlite3
from config import DB_NAME



def create_table():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    cursor.execute(''' 
        CREATE TABLE IF NOT EXISTS csv_data (
            Drawing_Number TEXT,       -- Renamed to Drawing_Number
            DATE TEXT,
            Qty INTEGER,
            USED_TIME TEXT,
            CURRENT_AV REAL,
            AVERAGE_TIME REAL,
            STAFF TEXT,
            COMMENT TEXT,
            NEW TEXT,
            TOTAL_AV REAL,
            CUST TEXT,
            CELLS INTEGER,
            B_PRICE REAL,
            S_PRICE REAL,
            PN TEXT
        )
    ''')
    
    conn.commit()
    conn.close()

create_table()
