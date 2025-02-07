import sqlite3
import openpyxl

DB_NAME = "clock_in_management.db"
EXCEL_FILE = "PN_DATA.xlsx"

def create_PN_table():
    """Create the Jobs table with all columns from Excel."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS PN_DATA (
            "INPUT DATE" TEXT,
            "PN" TEXT UNIQUE NOT NULL,
            "NO/CELL" TEXT,
            "DRAW NO" TEXT,
            "REQU-DATE" TEXT,
            "CUST" TEXT,
            "STOCK CODE" TEXT,
            "QTY" INTEGER,
            "CELL CODE" TEXT,
            "B$" REAL,
            "ORDER NO" TEXT,
            "MODEL" TEXT,
            "VOL" REAL,
            "AH" REAL,
            "WH" REAL,
            "CHEM" TEXT,
            "STRUCTURE" TEXT,
            "STAFF" TEXT,
            "WORKHR" REAL,
            "HR/PP" REAL,
            "END DATE" TEXT,
            "TEST TIME" TEXT,
            "AV" REAL,
            "S$" REAL,
            "C-DRAW" TEXT,
            "C-CELLS" TEXT,
            "C-AV" REAL,
            "C-B$" REAL,
            "C-S$" REAL,
            "C-STCODE" TEXT,
            "ORIGINAL S$" TEXT,
            "DISCOUNT" REAL,
            "SALESMAN" TEXT,
            "Customer Code" TEXT,
            "Order Date" TEXT
        )
    ''')

    conn.commit()
    conn.close()
    print("PN table created/updated in database.")


def import_jobs_from_excel():
    """Import all job data from Sample.xlsx into the database."""
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        workbook = openpyxl.load_workbook(EXCEL_FILE)
        sheet = workbook["Sheet1"]  # Ensure correct sheet name

        # Read headers from the first row
        headers = [cell.value for cell in sheet[1]]  

        # Ensure column names match table definition
        expected_columns = [
            "INPUT DATE", "PN", "NO/CELL", "DRAW NO", "REQU-DATE", "CUST", "STOCK CODE", 
            "QTY", "CELL CODE", "B$", "ORDER NO", "MODEL", "VOL", "AH", "WH", "CHEM", 
            "STRUCTURE", "STAFF", "WORKHR", "HR/PP", "END DATE", "TEST TIME", "AV", 
            "S$", "C-DRAW", "C-CELLS", "C-AV", "C-B$", "C-S$", "C-STCODE", "ORIGINAL S$", 
            "DISCOUNT", "SALESMAN", "Customer Code", "Order Date"
        ]

        # Verify if all expected columns exist
        column_indexes = {}
        for col_name in expected_columns:
            if col_name in headers:
                column_indexes[col_name] = headers.index(col_name)
            else:
                print(f"Warning: Column '{col_name}' not found in Excel.")

        # Insert job records
        for row in sheet.iter_rows(min_row=2, values_only=True):
            values = [row[column_indexes[col]] if column_indexes.get(col) is not None else None for col in expected_columns]
            
            try:
                cursor.execute(f'''
                    INSERT INTO PN_DATA ("{'", "'.join(expected_columns)}") 
                    VALUES ({", ".join(["?" for _ in expected_columns])})
                ''', values)
            except sqlite3.IntegrityError:
                pass  # Ignore duplicates

        conn.commit()
        conn.close()
        workbook.close()
        print("Jobs imported successfully into the database!")

    except Exception as e:
        print(f"Error importing jobs from Excel: {e}")

if __name__ == "__main__":
    create_PN_table()
    import_jobs_from_excel()
