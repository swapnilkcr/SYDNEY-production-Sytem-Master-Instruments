import openpyxl
import sqlite3

DB_NAME = 'clock_in_management.db'

def store_merged_data_to_db():
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()

        # Create the table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS MergedData (
                DrawNo TEXT PRIMARY KEY,
                AV REAL,
                STOCKCODE TEXT
            )
        ''')

        workbook = openpyxl.load_workbook('SampleAV.xlsx')
        sheet = workbook['MergedData']

        for row in sheet.iter_rows(min_row=2, values_only=True):
            draw_no, av, stock_code = row
            cursor.execute('''
                INSERT OR REPLACE INTO MergedData (DrawNo, AV, STOCKCODE)
                VALUES (?, ?, ?)
            ''', (draw_no, av, stock_code))

        conn.commit()
        conn.close()
        print("Data successfully stored in the database.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    store_merged_data_to_db()
