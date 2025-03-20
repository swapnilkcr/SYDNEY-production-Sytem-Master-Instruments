import os
import csv
import sqlite3
import logging
from config import DB_NAME

# Set up logging
logging.basicConfig(level=logging.DEBUG, filename="csv_loader.log", filemode="w",
                    format="%(asctime)s - %(levelname)s - %(message)s")

CSV_DIRECTORY = r'S:\USERDATA\Swapnil\AV-CSV'  # Change this to your actual directory

def load_csv_to_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    print("🚀 Starting CSV import process...")
    logging.info("Starting CSV import process...")

    for file in os.listdir(CSV_DIRECTORY):
        if file.endswith(".csv"):
            file_path = os.path.join(CSV_DIRECTORY, file)
            print(f"📂 Processing file: {file}")
            logging.debug(f"Processing file: {file}")

            # Trim the '.csv' extension from the file name
            drawing_number = os.path.splitext(file)[0]  # Renamed variable to `drawing_number`
            print(f"Drawing Number: {drawing_number}")

            try:
                with open(file_path, newline='', encoding='utf-8') as csvfile:
                    reader = csv.reader(csvfile)
                    headers = next(reader)  # Skip the header row
                    print(f"✅ Read header: {headers}")

                    # Trim headers to 14 columns (ignore the last 2 columns)
                    if len(headers) > 14:
                        headers = headers[:14]
                        print(f"✅ Trimmed headers to 14 columns: {headers}")

                    for row in reader:
                        # Skip empty or incomplete rows
                        if not any(row):  # Skip if the row is entirely empty
                            print(f"⚠️ Skipping empty row: {row}")
                            continue

                        # Strip spaces for each cell in the row
                        row = [col.strip() for col in row]

                        # Trim the row to 14 columns (ignore the last 2 columns)
                        if len(row) > 14:
                            row = row[:14]
                            print(f"✅ Trimmed row to 14 columns: {row}")

                        # Ensure the row has exactly 14 columns (fill missing with blank strings)
                        if len(row) < 14:
                            missing_columns = 14 - len(row)
                            row.extend([""] * missing_columns)  # Add blank strings for missing columns

                        # Ensure the columns have the correct types and handle missing numeric values
                        try:
                            # Set defaults (0.0 or "" as appropriate) if values are missing
                            # Columns that should be numeric: Qty, USED_TIME, CURRENT_AV, AVERAGE_TIME, TOTAL_AV, B_PRICE, S_PRICE
                            row[1] = float(row[1]) if row[1].replace('.', '', 1).isdigit() else 0.0  # Qty (should be numeric)
                            row[2] = float(row[2]) if row[2].replace('.', '', 1).isdigit() else 0.0  # USED_TIME (should be numeric)
                            row[3] = float(row[3]) if row[3].replace('.', '', 1).isdigit() else 0.0  # CURRENT_AV (should be numeric)
                            row[4] = float(row[4]) if row[4].replace('.', '', 1).isdigit() else 0.0  # AVERAGE_TIME (should be numeric)
                            row[8] = float(row[8]) if row[8].replace('.', '', 1).isdigit() else 0.0  # TOTAL_AV (should be numeric)
                            row[10] = float(row[10]) if row[10].replace('.', '', 1).isdigit() else 0.0  # B_PRICE (should be numeric)
                            row[11] = float(row[11]) if row[11].replace('.', '', 1).isdigit() else 0.0  # S_PRICE (should be numeric)

                            # Ensure that `STAFF` and `PN` are treated as strings and not converted to float
                            staff = row[5]  # STAFF as string
                            comment = row[6]  # COMMENT as string
                            new = row[7]  # NEW as string
                            cust = row[9]  # CUST as string
                            pn = row[13]  # PN as string

                            # If CUST is numeric, convert to integer (otherwise leave it as a string)
                            if cust.isdigit():
                                cust = int(cust)  # Convert to integer if it's a numeric value

                        except ValueError as e:
                            print(f"⚠️ Error converting data for row: {row}, Error: {e}")
                            logging.warning(f"Skipping row due to conversion error: {row}")
                            continue  # Skip rows that have invalid data

                        # Insert into the database with the corrected row
                        cursor.execute(''' 
                            INSERT INTO csv_data (
                                Drawing_Number, DATE, Qty, USED_TIME, CURRENT_AV, AVERAGE_TIME, STAFF, COMMENT,
                                NEW, TOTAL_AV, CUST, CELLS, B_PRICE, S_PRICE, PN
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            drawing_number,  # Drawing_Number (from filename)
                            row[0],         # DATE
                            row[1],         # Qty
                            row[2],         # USED_TIME
                            row[3],         # CURRENT_AV
                            row[4],         # AVERAGE_TIME
                            staff,          # STAFF
                            comment,        # COMMENT
                            new,            # NEW
                            row[8],         # TOTAL_AV
                            cust,           # CUST
                            row[10],        # CELLS
                            row[11],        # B_PRICE
                            row[12],        # S_PRICE
                            pn              # PN
                        ))

                print(f"✅ Successfully imported {file}")
                logging.info(f"Successfully imported {file}")

            except Exception as e:
                print(f"❌ Error processing {file}: {e}")
                logging.error(f"Error processing {file}: {e}")

    conn.commit()
    conn.close()
    print("🎉 CSV import process completed!")
    logging.info("CSV import process completed.")

if __name__ == "__main__":
    load_csv_to_db()