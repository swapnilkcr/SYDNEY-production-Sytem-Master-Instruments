import bcrypt
import csv
import openpyxl
import json
import sqlite3
from datetime import datetime
import pandas as pd
import io
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from datetime import datetime
import asyncio
import websockets
from urllib.parse import parse_qs,urlparse 
import urllib.parse
import time
from config import ENV, PORT,BASE_URL  # Import environment variables
import gzip
import json
from io import BytesIO  
import sqlite3
from datetime import datetime
import json
from config import DB_NAME


print(f"🚀 Environment: {ENV}")
print(f"🌐 Running on port: {PORT}")





def execute_with_retry(cursor, query, params=(), max_retries=5, delay=1):
    for attempt in range(max_retries):
        try:
            cursor.execute(query, params)
            return
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e).lower():
                print(f"Database is locked. Retrying ({attempt + 1}/{max_retries})...")
                time.sleep(delay)
            else:
                raise
    raise sqlite3.OperationalError("Database is locked after multiple retries")

def commit_with_retry(conn, max_retries=5, delay=1):
    for attempt in range(max_retries):
        try:
            conn.commit()
            return
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e).lower():
                print(f"Commit failed. Retrying ({attempt + 1}/{max_retries})...")
                time.sleep(delay)
            else:
                raise
    raise sqlite3.OperationalError("Commit failed after multiple retries")


#DB_NAME = 'clock_in_management.db'



'''async def send_update(action, staff_name, job_id, timestamp):
    """Send a WebSocket update when a job starts/stops."""
    message = {
        "action": action,
        "staffName": staff_name,
        "jobId": job_id,
        "timestamp": timestamp
    }
    try:
        async with websockets.connect("ws://127.0.0.1:8765") as websocket:
            await websocket.send(json.dumps(message))
    except Exception as e:
        print(f"Error sending WebSocket update: {e}")'''





# Format timestamp to 'YYYY-MM-DD HH:MM:SS'
def get_current_timestamp():
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


# Utility to ensure file exists
def ensure_file_exists(file_path, header=None):
    if not os.path.isfile(file_path):
        with open(file_path, 'w') as f:
            if header:
                f.write(header + '\n')

# Ensure staff.csv and jobs.csv exist
ensure_file_exists('staff.csv', header='StaffName')  # Add 'StaffName' as header for staff file


    

# Load staff names from a CSV file
def load_staff_from_csv(file_path):
    staff = []
    try:
        with open(file_path, mode='r') as csvfile:
            print(f"Attempting to read file: {file_path}")
            reader = csv.reader(csvfile)
            # Skip the header row if the CSV has one
            next(reader, None)
            for row in reader:
                print(f"Row read: {row}")
                if row:  # Ensure the row is not empty
                    staff.append(row[0])  # Assuming the first column contains staff names
        print(f"Staff loaded successfully: {staff}") 
    except Exception as e:
        print(f"Error reading staff CSV file: {e}")
    return staff



# Calculate Estimated Time from Av and QTY
def calculate_estimated_time(job_id):
    """Calculate the estimated time for a job based on AV and QTY columns from the database."""
    try:
        print(f"DEBUG: Called calculate_estimated_time() with job_id={job_id}")  # ✅ Ensure function is called

        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()

        # Fetch AV and QTY for the given job_id
        cursor.execute('SELECT AV, QTY FROM PN_DATA WHERE PN = ?', (job_id,))
        result = cursor.fetchone()
        conn.close()

        if result:
            av = float(result[0]) if result[0] is not None else 0.0
            qty = float(result[1]) if result[1] is not None else 0.0
            estimated_time = round(av * qty, 2)

            # ✅ Print debug info
            print(f"DEBUG: JobID={job_id}, AV={av}, QTY={qty}, Estimated Time={estimated_time}")

            return estimated_time
        else:
            print(f"DEBUG: No matching record found for JobID={job_id}")
            return 0.0  # Ensure function always returns a value

    except Exception as e:
        print(f"Error fetching estimated time: {e}")
        return 0.0

       
# Calculate Total Hours Worked by all users for a job
def get_total_hours_worked(job_id):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT COALESCE(SUM(
            CASE WHEN StopTime IS NOT NULL THEN 
                (strftime('%s', StopTime) - strftime('%s', StartTime)) / 3600.0
            ELSE
                (strftime('%s', 'now') - strftime('%s', StartTime)) / 3600.0  -- Ongoing job
            END
        ), 0.0)
        FROM ClockInOut WHERE JobID = ?
    ''', (job_id,))
    result = cursor.fetchone()
    conn.close()
    #print(f"Debug: SQL Query Result for JobID {job_id}: {result}")  # Debugging line
    return float(result[0]) if result and result[0] is not None else 0.0


def get_job_details(job_id):
    """Fetch customer name, drawing number, cell number, quantity, and required date from the database based on job_id (PN)."""
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()

        # Query to fetch all required job details
        cursor.execute('''
            SELECT CUST, "DRAW NO", "NO/CELL", QTY, "REQU-DATE"
            FROM PN_DATA
            WHERE PN = ?
        ''', (job_id,))
        result = cursor.fetchone()

        # Close the database connection
        conn.close()

        # Return a dictionary with fetched values or "Unknown" if not found
        return {
            "customerName": result[0] if result and result[0] else " No data",
            "drawingNumber": result[1] if result and result[1] else " ",
            "cellNo": result[2] if result and result[2] else " ",
            "quantity": result[3] if result and result[3] else " ",
            "requiredDate": result[4] if result and result[4] else " "
        }
    except Exception as e:
        print(f"Error fetching job details from the database: {e}")
        return {
            "customerName": "Unknown",
            "drawingNumber": "Unknown",
            "cellNo": "Unknown",
            "quantity": "Unknown",
            "requiredDate": "Unknown"
        }

    

def get_av_by_stock_code(stock_code):
    """Fetch AV based on STOCKCODE from the database."""
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()

        # Query to fetch AV using STOCK CODE
        cursor.execute('SELECT AV FROM MergedData WHERE STOCKCODE = ?', (stock_code,))
        result = cursor.fetchone()
        conn.close()

        return {'avValue': result[0]} if result else None
    except Exception as e:
        print(f"Error fetching AV from STOCKCODE: {e}")
        return None
    
def get_job_work_details(job_id):
    """Fetch total hours worked per user for a given job."""
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()

        # Ensure the Status column exists in the JOBSFINISHED table
        cursor.execute("PRAGMA table_info(JOBSFINISHED)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'Status' not in columns:
            cursor.execute("ALTER TABLE JOBSFINISHED ADD COLUMN Status TEXT")

        # 1. Check if the job is in the JOBSFINISHED table
        cursor.execute('''
            SELECT EstimatedTime, RemainingTime, TotalLaborCost, Status
            FROM JOBSFINISHED 
            WHERE PN = ?
        ''', (job_id,))
        finished_job_data = cursor.fetchone()

        if finished_job_data:
            # If job is finished, use stored values
            estimated_time = finished_job_data[0]
            remaining_time = finished_job_data[1]
            total_labor_cost = finished_job_data[2]
            status = finished_job_data[3] if finished_job_data[3] else 'Finished'
        else:
            # If job is active, calculate estimated and remaining time
            estimated_time = calculate_estimated_time(job_id)
            remaining_time = max(estimated_time - get_total_hours_worked(job_id), 0.0)
            total_labor_cost = 'In progress'
            status = 'Active'

        # 2. Fetch total hours worked per user
        cursor.execute('''
            SELECT StaffName, 
                   SUM(
                       (strftime('%s', COALESCE(StopTime, 'now')) - strftime('%s', StartTime)) / 3600.0
                   ) AS TotalHoursWorked
            FROM ClockInOut 
            WHERE JobID = ?
            GROUP BY StaffName
        ''', (job_id,))

        results = cursor.fetchall()
        conn.close()

        # Convert to JSON format
        users = [{'name': row[0], 'hours': round(row[1], 2)} for row in results]
        
        # Calculate total hours worked
        total_worked = sum([user['hours'] for user in users])

        # For finished jobs, ensure remaining time matches stored value
        if finished_job_data:
            remaining_time = finished_job_data[1]
        else:
            remaining_time = max(estimated_time - total_worked, 0.0)

        return {
            'jobId': job_id,
            'estimatedTime': estimated_time,
            'users': users,
            'remainingTime': remaining_time,
            'totalHoursWorked': total_worked,
            'totalLaborCost': total_labor_cost,
            'status': status
        }

    except Exception as e:
        print(f"Error in get_job_work_details: {e}")
        return {
            'error': str(e),
            'jobId': job_id,
            'estimatedTime': 0.0,
            'users': [],
            'remainingTime': 0.0,
            'totalHoursWorked': 0.0,
            'totalLaborCost': 'Unknown',
            'status': 'Unknown'
        }




    
#from store_merged_data import store_merged_data_to_db

# Call this function during initialization if required
#store_merged_data_to_db()


# Define the HTTP request handler
class ClockInOutHandler(BaseHTTPRequestHandler):
    def set_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type,X-User-Role')
        self.send_header('Cache-Control', 'no-store')
    
    
    def do_OPTIONS(self):
        # Handle preflight requests for CORS
        self.send_response(200)
        self.set_cors_headers()
        self.send_header('X-Content-Type-Options', 'nosniff')  
        self.end_headers()
    # Add the /view-running-jobs endpoint to the do_GET method
    def do_GET(self):
        #self.send_response(200)
        #self.set_cors_headers()

        
        if self.path == '/get-staff':
            # Load staff data from the CSV file
            staff_list = load_staff_from_csv('staff.csv')

            # Respond with the staff list
            self.send_response(200)
            self.set_cors_headers()
            self.send_header('Content-type', 'application/json')
            #self.send_header('Cache-Control', 'no-store') 
            self.end_headers()
            response = {'staff': staff_list}
            self.wfile.write(json.dumps(response).encode('utf-8'))

        elif self.path == '/get-jobs':
            try:
                conn = sqlite3.connect(DB_NAME)
                cursor = conn.cursor()

                # Fetch all job details from PN_DATA
                cursor.execute("SELECT PN, CUST, \"REQU-DATE\" FROM PN_DATA")
                jobs = cursor.fetchall()

                conn.close()

                # Convert results into JSON format
                job_records = [{'jobId': row[0],
                                'customer': row[1],
                                'requiredDate' : row[2]} for row in jobs]

                self.send_response(200)
                self.set_cors_headers()
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {'jobs': job_records}
                self.wfile.write(json.dumps(response).encode('utf-8'))

            except Exception as e:
                self.send_response(500)
                self.set_cors_headers()
                self.send_header('Content-type', 'application/json')
                #self.send_header('Cache-Control', 'no-store')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))


        elif self.path.startswith("/get-av"):
            query_string = self.path.split('?')[-1]
            query_params = urllib.parse.parse_qs(query_string)
            stock_code = query_params.get('stockCode', [None])[0]

            if stock_code:
                data = get_av_by_stock_code(stock_code)
                if data:
                    response = {'avValue': data['avValue']}
                else:
                    response = {'error': 'No AV found for the given STOCK CODE'}
            else:
                response = {'error': 'STOCK CODE parameter is required'}

            self.send_response(200)
            self.set_cors_headers()
            self.send_header('Content-Type', 'application/json')
            #self.send_header('Cache-Control', 'no-store') 
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))

            
        elif self.path == '/get-totallaborcost':
            try:
                conn = sqlite3.connect(DB_NAME)
                cursor = conn.cursor()

                # Query to fetch Job IDs and their total labor costs
                cursor.execute('''
                    SELECT JobID, TotalLaborCost FROM JobTable
                ''')
                jobs = cursor.fetchall()
                conn.close()

                # Prepare the response in JSON format
                job_records = [{'jobId': job[0], 'totalLaborCost': job[1] or 0.0} for job in jobs]

                self.send_response(200)
                self.set_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {'jobs': job_records}
                self.wfile.write(json.dumps(response).encode('utf-8'))

            except Exception as e:
                print(f"Error in /get-totallaborcost: {str(e)}")
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))




        
        elif self.path.startswith("/view-times"):
            try:
                # Parse query parameters
                parsed_url = urlparse(self.path)
                query_params = parse_qs(parsed_url.query)
                
                # Pagination parameters
                page = int(query_params.get('page', [1])[0])
                page_size = int(query_params.get('page_size', [5])[0])
                offset = (page - 1) * page_size
                
                # Filter parameters
                filter_column = query_params.get('filter_column', ['all'])[0]
                filter_value = query_params.get('filter_value', [''])[0].lower()
                
                conn = sqlite3.connect(DB_NAME)
                cursor = conn.cursor()

                # Base query
                # In the /view-times endpoint's SQL query, modify to:
                base_query = '''
                SELECT 
                    c.RecordID,
                    c.StaffName,
                    c.JobID,
                    c.StartTime,
                    c.StopTime,
                    c.LaborCost,
                    j.CUST AS CustomerName,
                    j."DRAW NO" AS DrawingNumber,
                    j."NO/CELL" AS CellNo,
                    j.QTY AS Quantity,
                    j."REQU-DATE" AS RequestDate,
                    COALESCE(j.AV * j.QTY, 0.0) AS EstimatedTime,
                    ROUND(COALESCE(
                        (strftime('%s', c.StopTime) - strftime('%s', c.StartTime)) / 3600.0, 0.0
                    ), 2) AS TotalHoursWorked,
                    CASE 
                    WHEN jt.Status = 'Finished' THEN 'Finished'
                    WHEN f.Status = 'Completed' THEN 'Completed'
                    ELSE 'Active'
                    END AS Status
                FROM ClockInOut c
                LEFT JOIN PN_DATA j ON c.JobID = j.PN
                LEFT JOIN JOBSFINISHED f ON c.JobID = f.PN
                LEFT JOIN JobTable jt ON c.JobID = jt.JobID  
                '''

                # Filter mapping
                column_map = {
                    '0': 'c.StaffName',
                    '1': 'c.JobID',
                    '2': 'j."DRAW NO"',
                    '3': 'j."NO/CELL"',
                    '4': 'j.QTY',
                    '5': 'j.CUST',
                    '6': 'c.StartTime',
                    '7': 'c.StopTime',
                    '8': 'TotalHoursWorked',
                    '9': 'EstimatedTime',
                    '10': '(EstimatedTime - TotalHoursWorked)',
                    '11': 'c.LaborCost'
                }

                # Build WHERE clause
                where_clauses = []
                params = []
                
                if filter_value and filter_column != 'all':
                    if filter_column in column_map:
                        where_clauses.append(f"LOWER({column_map[filter_column]}) LIKE ?")
                        params.append(f'%{filter_value}%')

                where_stmt = ' WHERE ' + ' AND '.join(where_clauses) if where_clauses else ''

                # Count total records
                count_query = f"SELECT COUNT(*) FROM ({base_query}{where_stmt})"
                cursor.execute(count_query, params)
                total_records = cursor.fetchone()[0]

                # Data query with pagination
                data_query = f'''
                    {base_query}
                    {where_stmt}
                    ORDER BY c.StartTime DESC
                    LIMIT ? OFFSET ?
                '''
                
                cursor.execute(data_query, params + [page_size, offset])
                rows = cursor.fetchall()
                conn.close()

                # Process records
                records = []
                for row in rows:
                    record = {
                        'recordId': row[0],
                        'staffName': row[1],
                        'jobId': row[2],
                        'startTime': row[3] or 'NA',
                        'stopTime': row[4] if row[4] else "In Progress",
                        'laborCost': row[5] if row[5] is not None else 0.0,
                        'customerName': row[6] or " ",
                        'drawingNumber': row[7] or " ",
                        'cellNo': row[8] or " ",
                        'quantity': row[9] or " ",
                        'requDate': row[10],
                        'estimatedTime': float(row[11]),
                        'totalHoursWorked': float(row[12]),
                        'remainingTime': max(float(row[11]) - float(row[12]), 0.0),
                        'status' : row[13]
                    }
                    records.append(record)

                # Calculate pagination
                total_pages = (total_records + page_size - 1) // page_size
                
                # Prepare response
                response = {
                    'records': records,
                    'totalRecords': total_records,
                    'totalPages': total_pages,
                    'currentPage': page
                }

                # Send compressed response
                json_data = json.dumps(response).encode('utf-8')
                buffer = BytesIO()
                with gzip.GzipFile(fileobj=buffer, mode='wb') as gzip_file:
                    gzip_file.write(json_data)
                
                self.send_response(200)
                self.set_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Encoding', 'gzip')
                self.send_header('Content-Length', str(len(buffer.getvalue())))
                self.end_headers()
                self.wfile.write(buffer.getvalue())

            except Exception as e:
                print(f"Error in /view-times: {str(e)}")
                self.send_response(500)
                self.set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))



        elif self.path == '/view-running-jobs':
            # Fetch running jobs
            try:
                conn = sqlite3.connect(DB_NAME)
                cursor = conn.cursor()

                # Query for jobs with StopTime IS NULL
                cursor.execute("""
                    SELECT c.StaffName, c.JobID, j.CUST, c.StartTime
                    FROM ClockInOut c
                    LEFT JOIN PN_DATA j ON c.JobID = j.PN
                    WHERE c.StopTime IS NULL
                """)
                rows = cursor.fetchall()
                print(f"Running jobs fetched: {rows}")  # This will show the data in the server logs
                conn.close()
                # Log the result of the query
                print(f"Running jobs fetched: {rows}")

                # Format the response
                running_jobs = []
                for row in rows:
                    running_jobs.append({
                        'staffName': row[0],
                        'jobId': row[1],
                        'customerName': row[2] or 'N/A',
                        'startTime': row[3],
                    })

                # Send response
                self.send_response(200)
                self.set_cors_headers()
                self.send_header('Content-type', 'application/json')
                #self.send_header('Cache-Control', 'no-store')
                self.end_headers()
                response = {'runningJobs': running_jobs}
                self.wfile.write(json.dumps(response).encode('utf-8'))

            except Exception as e:
                # Handle errors
                print(f"Error fetching running jobs: {str(e)}")
                self.send_response(500)
                self.set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

        elif self.path == '/export-to-excel':
            # Export the database table to Excel and send it to the client
            try:
                output_file = 'clock_in_data.xlsx'
                query = "SELECT * FROM ClockInOut"
                connection = sqlite3.connect('clock_in_management.db')
                df = pd.read_sql_query(query, connection)
                
                # Save the Excel file to a BytesIO stream
                output_stream = io.BytesIO()
                df.to_excel(output_stream, index=False, engine='openpyxl')
                output_stream.seek(0)  # Rewind the stream

                # Send the Excel file as a response
                self.send_response(200)
                self.send_cors_headers()
                self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                #self.send_header('Cache-Control', 'no-store')
                self.send_header('Content-Disposition', 'attachment; filename="clock_in_data.xlsx"')
                self.end_headers()
                self.wfile.write(output_stream.read())  # Write the file content to the response

            except Exception as e:
                # Handle errors
                self.send_response(500)
                self.set_cors_headers()
                #self.send_header('Cache-Control', 'no-store')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

        elif self.path == '/view-finished-jobs':
            try:
                conn = sqlite3.connect(DB_NAME)
                cursor = conn.cursor()

                # First check if table exists
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='JOBSFINISHED'")
                table_exists = cursor.fetchone()

                if not table_exists:
                    # Table doesn't exist yet, return empty list
                    response = {'jobs': []}
                else:
                    # Get all columns from JOBSFINISHED
                    cursor.execute("PRAGMA table_info(JOBSFINISHED)")
                    columns = [col[1] for col in cursor.fetchall()]

                    # Fetch all finished jobs
                    cursor.execute("SELECT * FROM JOBSFINISHED")
                    rows = cursor.fetchall()

                    # Convert to list of dictionaries with proper column names
                    finished_jobs = []
                    for row in rows:
                        job = {columns[i]: value for i, value in enumerate(row)}
                        finished_jobs.append(job)

                    response = {'jobs': finished_jobs}

                conn.close()

                self.send_response(200)
                self.set_cors_headers()
                self.send_header('Content-Type', 'application/json')
                #self.send_header('Cache-Control', 'no-store')  #Prevents caching
                self.end_headers()
                self.wfile.write(json.dumps(response).encode('utf-8'))

            except Exception as e:
                print(f"Error fetching finished jobs: {str(e)}")
                self.send_response(500)
                self.set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

        elif self.path.startswith("/get-job-work-details"):
            query_string = self.path.split('?')[-1]
            query_params = urllib.parse.parse_qs(query_string)
            job_id = query_params.get('jobId', [None])[0]

            if not job_id:
                self.send_response(400)
                self.set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Job ID is required'}).encode('utf-8'))
                return

            # Get work details for job
            job_details = get_job_work_details(job_id)
            self.send_response(200)
            self.set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(job_details).encode('utf-8'))

            
        
        # In ClockInOutHandler's do_GET method
        elif self.path.startswith('/get-csv-data'):
            try:
                # Parse query parameters
                query = urlparse(self.path).query
                params = parse_qs(query)
                Drawing_Number = params.get('Drawing_Number', [None])[0]
                print(f"🔍 Received Drawing_Number: {Drawing_Number} (Type: {type(Drawing_Number)})")


                conn = sqlite3.connect(DB_NAME)
                cursor = conn.cursor()

                # Build query based on file_name
                if Drawing_Number and Drawing_Number.strip():
                    Drawing_Number = Drawing_Number.strip()  # Trim spaces
                    sql_query = 'SELECT * FROM csv_data WHERE Drawing_Number = ? ORDER BY DATE DESC'
                    print(f"📝 Executing SQL: {sql_query} with value '{Drawing_Number}'")
                    cursor.execute(sql_query, (Drawing_Number,))
                else:
                    print("⚠️ Drawing_Number is missing, returning all records.")
                    cursor.execute('SELECT * FROM csv_data')

                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()
                conn.close()


               

                # Convert rows to list of dictionaries
                csv_data = [dict(zip(columns, row)) for row in rows]
                hidden_column = 'NEW'  # Column to hide
                for row in csv_data:
                    if hidden_column in row:
                        del row[hidden_column] 

                
                for i, row in enumerate(csv_data):
                    if i == 0:
                        # First row: Set TOTAL_AV = AVERAGE_TIME
                        row['TOTAL_AV'] = row['AVERAGE_TIME']
                    else:
                        # Subsequent rows: Set TOTAL_AV to empty string
                        row['TOTAL_AV'] = ' '
                    

                self.send_response(200)
                self.set_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'csvData': csv_data}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))



        elif self.path == "/get-config":
             # Serve the BASE_URL to the frontend
            self.send_response(200)
            self.set_cors_headers()
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {'base_url': BASE_URL}
            self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self.send_response(404)
            self.set_cors_headers()
            #self.send_header('Cache-Control', 'no-store')  #Prevents caching
            self.end_headers()


        

    

        
    
    def do_POST(self):
        '''self.send_response(200)
        self.set_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')  # Allow all origins
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('X-Content-Type-Options', 'nosniff')'''
        
        if self.path == '/clock-in':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            data = json.loads(post_data.decode('utf-8'))
            staff_name = data['staffName']
            job_id = data['jobId']
            start_time_str = data['startTime']
            stop_time_str = data['stopTime']

            conn = sqlite3.connect(DB_NAME)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO ClockInOut (StaffName, JobID, StartTime, StopTime)
                VALUES (?, ?, ?, ?)
            ''', (staff_name, job_id, start_time_str, stop_time_str))

            conn.commit()
            conn.close()

            self.send_response(200)
            self.set_cors_headers()
            self.send_header('Content-type', 'application/json')
            self.end_headers()

            response = {'message': 'Data saved successfully!'}
            self.wfile.write(json.dumps(response).encode('utf-8'))



        elif self.path == '/start-job':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))

                staff_name = data['staffName']
                job_id = data['jobId']
                start_time = get_current_timestamp()  # Get the current timestamp


                conn = sqlite3.connect(DB_NAME)
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO ClockInOut (StaffName, JobID, StartTime, StopTime)
                    VALUES (?, ?, ?, NULL)
                ''', (staff_name, job_id, start_time))

                conn.commit()
                conn.close()

                # Respond with success
                self.send_response(200)
                self.set_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Job started successfully!'}).encode('utf-8'))
            except Exception as e:
                # Handle errors
                self.send_response(500)
                self.set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
            finally:
                if conn:
                    conn.close()


        elif self.path == '/stop-job':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                print(f"Received stop-job data: {data}")  # Log incoming data

                staff_name = data['staffName']
                job_id = data['jobId']
                stop_time = get_current_timestamp()  # Get the current timestamp

                with sqlite3.connect('clock_in_management.db') as conn:
                    cursor = conn.cursor()
                    cursor.execute('''
                        UPDATE ClockInOut
                        SET StopTime = ?
                        WHERE StaffName = ? AND JobID = ? AND StopTime IS NULL
                    ''', (stop_time, staff_name, job_id))
                    conn.commit()
                    print(f"Rows updated: {cursor.rowcount}")  # Log row count

                    if cursor.rowcount == 0:
                        raise ValueError("No active job found for the given staffName and jobId.")

                self.send_response(200)
                self.set_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Job stopped successfully!'}).encode('utf-8'))

            except Exception as e:
                print(f"Error in /stop-job: {e}")  # Log the error
                self.send_response(500)
                self.set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))


        elif self.path == '/add-staff':
            try:
                # Read and parse the incoming JSON data
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))  # Parse JSON

                # Get the staffName from the parsed data
                staff_name = data.get('staffName', '').strip()
                if not staff_name:
                    raise ValueError("Staff Name is required.")

                # Append the staff name to the staff.csv file
                with open('staff.csv', mode='a', newline='') as csvfile:
                    writer = csv.writer(csvfile)
                    writer.writerow([staff_name])

                # Respond with success
                self.send_response(200)
                self.set_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Staff added successfully!'}).encode('utf-8'))
            except Exception as e:
                # Handle errors
                self.send_response(400)
                self.set_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

    
        elif self.path == '/add_job':
            try:
                # Read and parse the incoming JSON data
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))

                # Extract job details from request
                job_id = data.get('pn', '').strip()
                input_date = datetime.now().strftime('%Y-%m-%d')  # Current date
                no_cell = data.get('noCell', '')
                draw_no = data.get('drawNo', '')
                req_date = data.get('reqDate', '')
                cust = data.get('cust', '')
                stock_code = data.get('stockCode', '')
                qty = data.get('qty', 0)
                cell_code = data.get('cellCode', '')
                b_price = data.get('bPrice', 0)
                order_no = data.get('orderNo', '')
                model = data.get('model', '')
                vol = data.get('vol', 0)
                ah = data.get('ah', 0)
                wh = data.get('wh', 0)
                chem = data.get('chem', '')
                structure = data.get('structure', '')
                staff = data.get('staff', '')
                workhr = data.get('workhr', 0)
                hrpp = data.get('HRPP', 0)
                end_date = data.get('endDate', '')
                test_time = data.get('testTime', 0)
                av = data.get('av', 0)
                s_price = data.get('sPrice', 0)
                discount = data.get('discount', 0)
                salesman = data.get('salesman', '')
                customer_code = data.get('customerCode', '')
                order_date = data.get('orderDate', '')

                # Insert into database
                conn = sqlite3.connect(DB_NAME)
                cursor = conn.cursor()

                cursor.execute('''
                    INSERT INTO PN_DATA (PN, "INPUT DATE", "NO/CELL", "DRAW NO", "REQU-DATE", "CUST", 
                                        "STOCK CODE", "QTY", "CELL CODE", "B$", "ORDER NO", "MODEL", "VOL", 
                                        "AH", "WH", "CHEM", "STRUCTURE", "STAFF", "WORKHR", "HR/PP", "END DATE", 
                                        "TEST TIME", "AV", "S$", "DISCOUNT", "SALESMAN", "Customer Code", "Order Date") 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (job_id, input_date, no_cell, draw_no, req_date, cust, stock_code, qty, cell_code, b_price, 
                    order_no, model, vol, ah, wh, chem, structure, staff, workhr, hrpp, end_date, test_time, 
                    av, s_price, discount, salesman, customer_code, order_date))
                


                #Adds job to JobTable
                cursor.execute(''' 
                    INSERT INTO JobTable (JobID, TotalLaborCost, EstimatedTime, TotalHoursWorked, RemainingTime)
                    SELECT ?, 0, 0, 0, 0.0
                    WHERE NOT EXISTS (SELECT 1 FROM JobTable WHERE JobID = ?)
                ''', (job_id, job_id))

                

                conn.commit()
                

                # Send success response
                self.send_response(200)
                self.set_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Job added successfully!'}).encode('utf-8'))
                
                conn.close()
            except Exception as e:
                # Log the error for debugging
                print(f"Error: {e}")
                self.send_response(500)
                self.set_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
                    
            finally:
                if conn:
                    conn.close()  # 

                
        elif self.path == '/submit-job':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))

                # Define the Excel sheet headers (same as your fieldnames)
                fieldnames = ['INPUT DATE', 'PN', 'NO/CELL', 'DRAW NO', 'REQU-DATE', 'CUST', 'STOCK CODE',
                            'QTY', 'CELL CODE', 'B$', 'ORDER NO', 'MODEL', 'VOL', 'AH', 'WH', 'CHEM',
                            'STRUCTURE', 'STAFF', 'WORKHR', 'HRPP', 'END DATE', 'TEST TIME', 'AV',
                            'S$', 'C-DRAW', 'C-CELLS', 'C-AV', 'C-B$', 'C-S$', 'C-STCODE', 'ORIGINAL', 'DISCOUNT',
                            'SALESMAN', 'CUSTOMERCODE', 'ORDERDATE']

                # Mapping the incoming JSON data to the Excel columns
                mapped_data = {
                    'INPUT DATE': data.get('inputDate', ''),
                    'PN': data.get('pn', ''),
                    'NO/CELL': data.get('noCell', ''),
                    'DRAW NO': data.get('drawNo', ''),
                    'REQU-DATE': data.get('requDate', ''),
                    'CUST': data.get('cust', ''),
                    'STOCK CODE': data.get('stockCode', ''),
                    'QTY': data.get('qty', ''),
                    'CELL CODE': data.get('cellCode', ''),
                    'B$': data.get('bPrice', ''),
                    'ORDER NO': data.get('orderNo', ''),
                    'MODEL': data.get('model', ''),
                    'VOL': data.get('vol', ''),
                    'AH': data.get('ah', ''),
                    'WH': data.get('wh', ''),
                    'CHEM': data.get('chem', ''),
                    'STRUCTURE': data.get('structure', ''),
                    'STAFF': data.get('staff', ''),
                    'WORKHR': data.get('workhr', ''),
                    'HRPP': data.get('HRPP', ''),
                    'END DATE': data.get('endDate', ''),
                    'TEST TIME': data.get('testTime', ''),
                    'AV': data.get('av', ''),
                    'S$': data.get('sPrice', ''),
                    'SALESMAN': data.get('salesman', ''),
                    'CUSTOMERCODE': data.get('customerCode', ''),
                    'ORDERDATE': data.get('orderDate', '')
                }

                # File path for the Excel file
                file_path = 'Sample.xlsx'

                # Check if the file exists
                file_exists = os.path.isfile(file_path)

                # Load or create the workbook
                if file_exists:
                    workbook = openpyxl.load_workbook(file_path)
                    sheet = workbook['Sheet1']
                else:
                    # Create a new workbook and write headers if file doesn't exist
                    workbook = openpyxl.Workbook()
                    sheet = workbook.active
                    # Write headers
                    sheet.append(fieldnames)

                # Append the mapped data to the sheet
                sheet.append([mapped_data.get(col, '') for col in fieldnames])

                # Save the workbook
                workbook.save(file_path)

                # Send success response
                self.send_response(200)
                self.set_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Job added successfully!'}).encode('utf-8'))

            except Exception as e:
                # Handle errors
                self.send_response(500)
                self.set_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

        elif self.path == '/finish-job':
            self.handle_finish_job()

        
        elif self.path == '/move-job':
            print("Handling /move-job request")  # Confirm route hit
            self.handle_move_job()


        #EDIT clock in/out
        elif self.path == '/edit-clock':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # Admin check
            user_role = self.headers.get('X-User-Role', 'user').lower()
            if user_role != 'admin':
                self.send_response(403)
                self.set_cors_headers()  # ✅ Use helper function for consistent CORS
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Forbidden'}).encode())
                return

            record_id = data['recordId']
            new_start = data['newStartTime']
            new_stop = data['newStopTime']

            try:
                conn = sqlite3.connect(DB_NAME)
                cursor = conn.cursor()

                # Check if the job is in progress (StopTime is NULL)
                cursor.execute("SELECT StopTime FROM ClockInOut WHERE RecordID = ?", (record_id,))
                stop_time = cursor.fetchone()

                if stop_time and stop_time[0] is None:
                    # The job is still running, only update StartTime
                    cursor.execute("""
                        UPDATE ClockInOut
                        SET StartTime = ?
                        WHERE RecordID = ? AND StopTime IS NULL
                    """, (new_start, record_id))
                else:
                    # If job is already stopped, allow full edit
                    cursor.execute("""
                        UPDATE ClockInOut
                        SET StartTime = ?, StopTime = ?
                        WHERE RecordID = ?
                    """, (new_start, new_stop, record_id))

                conn.commit()

                self.send_response(200)
                self.set_cors_headers()  # ✅ Use helper function for consistent CORS
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Record updated successfully'}).encode())
            except Exception as e:
                self.send_response(500)
                self.set_cors_headers()  # ✅ Apply CORS headers for error response too
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
            finally:
                if conn:
                    conn.close()

        elif self.path == '/delete-clock':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # Admin check
            user_role = self.headers.get('X-User-Role', 'user').lower()
            if user_role != 'admin':
                self.send_response(403)
                self.end_headers()
                return

            record_id = data['recordId']

            try:
                conn = sqlite3.connect(DB_NAME)
                cursor = conn.cursor()
                cursor.execute('DELETE FROM ClockInOut WHERE RecordID = ?', (record_id,))
                conn.commit()
                self.send_response(200)
                self.set_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Record deleted successfully'}).encode())
            except Exception as e:
                self.send_response(500)
                self.set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())

       
        else:
            self.send_response()
            self.send_response(404)
            self.set_cors_headers()
            self.end_headers()



     #Finish job       
    def handle_finish_job(self):
        conn = None
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            
            job_id = data.get('jobId')
            hourly_rate = 25.0  # Consider storing this in a config table

            if not job_id:
                self.send_response(400)
                self.set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Missing staffName or jobId'}).encode())
                return

            conn = sqlite3.connect(DB_NAME)
            cursor = conn.cursor()

            # Ensure all entries for this job are closed
            cursor.execute('''
                UPDATE ClockInOut 
                SET StopTime = COALESCE(StopTime, ?)
                WHERE JobID = ? AND StopTime IS NULL
            ''', (get_current_timestamp(), job_id))

            # Calculate labor costs for all entries
            cursor.execute('''
                SELECT StaffName, StartTime, StopTime 
                FROM ClockInOut 
                WHERE JobID = ?
            ''', (job_id,))
            

            total_labor_cost = 0.0
            time_entries = cursor.fetchall()
            
            for staff_name ,start_time, stop_time in time_entries:
                try:
                    start_dt = datetime.strptime(start_time, '%Y-%m-%d %H:%M:%S')
                    stop_dt = datetime.strptime(stop_time, '%Y-%m-%d %H:%M:%S') if stop_time else datetime.now()
                    hours = (stop_dt - start_dt).total_seconds() / 3600
                    labor_cost = round(hours * hourly_rate, 2)
                    
                    # Update individual record
                    cursor.execute('''
                        UPDATE ClockInOut
                        SET LaborCost = ?
                        WHERE StaffName = ? AND JobID = ? AND StartTime = ?
                    ''', (labor_cost, staff_name, job_id, start_time))
                    
                    total_labor_cost += labor_cost
                    
                except Exception as e:
                    print(f"Error processing entry {start_time}-{stop_time}: {str(e)}")
                    continue

            # Update job metadata
            estimated_time = round(calculate_estimated_time(job_id),2)
            total_hours_worked = round(get_total_hours_worked(job_id),2)
            remaining_time = round(max(estimated_time - total_hours_worked, 0.0),2)

            cursor.execute('''
                INSERT OR REPLACE INTO JobTable 
                (JobID, TotalLaborCost, EstimatedTime, TotalHoursWorked, RemainingTime,Status)
                VALUES (?, ?, ?, ?, ?,'Finished')
            ''', (job_id, total_labor_cost, estimated_time, total_hours_worked, remaining_time))

            conn.commit()
            
            self.send_response(200)
            self.set_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'message': 'Job finalized successfully',
                'totalLaborCost': total_labor_cost,
                'totalHours': total_hours_worked,
                'remainingTime': remaining_time
            }).encode())

        except sqlite3.Error as e:
            print(f"Database error: {str(e)}")
            if conn: conn.rollback()
            self.send_response(500)
            self.set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Database operation failed'}).encode())
            
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            if conn: conn.rollback()
            self.send_response(500)
            self.set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Internal server error'}).encode())
            
        finally:
            if conn: 
                conn.close()


    def handle_move_job(self):
        conn = None
        try:
            # Step 1: Parse request data
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            job_id = data.get('jobId', '').strip()

            if not job_id:
                self.send_response(400)
                self.set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Job ID is required'}).encode())
                return

            print(f"Processing job_id: {job_id}")  # Debugging

            # Step 2: Connect to database with retry logic
            max_retries = 5
            retry_delay = 1  # seconds
            for attempt in range(max_retries):
                try:
                    conn = sqlite3.connect(DB_NAME, timeout=30)
                    cursor = conn.cursor()

                    # Step 3: Fetch job metrics
                    cursor.execute('''
                        SELECT TotalLaborCost, EstimatedTime, TotalHoursWorked, RemainingTime
                        FROM JobTable WHERE JobID = ?
                    ''', (job_id,))
                    job_metrics = cursor.fetchone()

                    if not job_metrics:
                        raise ValueError(f"No metrics found for job {job_id}")

                    print(f"Job metrics: {job_metrics}")  # Debugging

                    # Step 4: Insert into JOBSFINISHED with all columns from PN_DATA
                    cursor.execute('''
                        INSERT INTO JOBSFINISHED (
                            "INPUT DATE", PN, "NO/CELL", "DRAW NO", "REQU-DATE", CUST, "STOCK CODE", 
                            QTY, "CELL CODE", "B$", "ORDER NO", MODEL, VOL, AH, WH, CHEM, STRUCTURE, 
                            STAFF, WORKHR, "HR/PP", "END DATE", "TEST TIME", AV, "S$", "C-DRAW", 
                            "C-CELLS", "C-AV", "C-B$", "C-S$", "C-STCODE", "ORIGINAL S$", DISCOUNT, 
                            SALESMAN, "Customer Code", "Order Date", TotalLaborCost, EstimatedTime, 
                            RemainingTime, TotalHoursWorked, Status
                        )
                        SELECT 
                            "INPUT DATE", PN, "NO/CELL", "DRAW NO", "REQU-DATE", CUST, "STOCK CODE", 
                            QTY, "CELL CODE", "B$", "ORDER NO", MODEL, VOL, AH, WH, CHEM, STRUCTURE, 
                            STAFF, WORKHR, "HR/PP", "END DATE", "TEST TIME", AV, "S$", "C-DRAW", 
                            "C-CELLS", "C-AV", "C-B$", "C-S$", "C-STCODE", "ORIGINAL S$", DISCOUNT, 
                            SALESMAN, "Customer Code", "Order Date", ?, ?, ?, ?, 'Completed'
                        FROM PN_DATA WHERE PN = ?
                    ''', (*job_metrics, job_id))

                    print(f"Inserted into JOBSFINISHED for job_id: {job_id}")  # Debugging

                    # Step 5: Insert into csv_data
                    cursor.execute('''
                        SELECT "DRAW NO", QTY, CUST, "B$", "S$", PN, "INPUT DATE", "NO/CELL"
                        FROM PN_DATA WHERE PN = ?
                    ''', (job_id,))
                    pn_data = cursor.fetchone()

                    if pn_data:
                        print(f"PN data: {pn_data}")  # Debugging
                        drawing_number = pn_data[0] or 'N/A'
                        qty = int(pn_data[1]) if pn_data[1] else 0
                        cust = pn_data[2] or 'N/A'
                        b_price = float(pn_data[3]) if pn_data[3] else 0.0
                        s_price = float(pn_data[4]) if pn_data[4] else 0.0
                        pn = pn_data[5] or 'N/A'
                        input_date = pn_data[6] or '1900-01-01'
                        cells = int(pn_data[7]) if pn_data[7] and str(pn_data[7]).isdigit() else None

                        total_hours_worked = job_metrics[2]
                        used_time = f"{total_hours_worked:.4f}"
                        current_av = round(total_hours_worked / qty, 5) if qty else 0.0

                        # Fetch distinct staff names and concatenate them
                        cursor.execute('''
                            SELECT DISTINCT StaffName 
                            FROM ClockInOut 
                            WHERE JobID = ? AND StaffName IS NOT NULL
                        ''', (job_id,))
                        staff_names = [row[0] for row in cursor.fetchall()]
                        staff = "/".join(staff_names) if staff_names else "N/A"
                        print(f"Staff: {staff}")  # Debugging

                        # Calculate the sum of Used_time and Qty for the Drawing_Number
                        cursor.execute('''
                            SELECT 
                                SUM(CAST(USED_TIME AS REAL)), 
                                SUM(Qty) 
                            FROM csv_data 
                            WHERE Drawing_Number = ?
                        ''', (drawing_number,))
                        sum_used_time, sum_qty = cursor.fetchone() or (0.0, 0)

                        # Add the current job's values to the sums
                        sum_used_time += float(used_time)
                        sum_qty += qty

                        # Calculate the new average
                        average = round(sum_used_time / sum_qty, 5) if sum_qty else 0.0
                        print(f"Average: {average}")  # Debugging

                        # Insert into csv_data
                        cursor.execute('''
                            INSERT INTO csv_data (
                                Drawing_Number, DATE, Qty, USED_TIME, CURRENT_AV,
                                AVERAGE_TIME, STAFF, COMMENT, NEW, 'TOTAL_AV',
                                CUST, CELLS, B_PRICE, S_PRICE, PN
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            drawing_number, input_date, qty, used_time, current_av,
                            average, staff, 'N/A', 'N/A', average,  # TOTAL_AV = average
                            cust, cells, b_price, s_price, pn
                        ))

                        print(f"Inserted into csv_data for job_id: {job_id}")  # Debugging

                    # Step 6: Delete from PN_DATA and JobTable
                    cursor.execute('DELETE FROM PN_DATA WHERE PN = ?', (job_id,))
                    cursor.execute('DELETE FROM JobTable WHERE JobID = ?', (job_id,))

                    print(f"Deleted from PN_DATA and JobTable for job_id: {job_id}")  # Debugging

                    # Commit all changes
                    conn.commit()
                    print(f"Committed changes for job_id: {job_id}")  # Debugging
                    break  # Exit retry loop on success

                except sqlite3.OperationalError as e:
                    if "database is locked" in str(e).lower():
                        print(f"Database locked, retrying ({attempt + 1}/{max_retries})...")
                        time.sleep(retry_delay)
                        continue
                    raise
                except Exception as e:
                    print(f"Error during move-job: {str(e)}")
                    if conn:
                        conn.rollback()
                    raise

            # Step 7: Send success response
            self.send_response(200)
            self.set_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'message': 'Job moved successfully!'}).encode())

        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            self.send_response(500)
            self.set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Internal server error'}).encode())

        finally:
            if conn:
                conn.close()

    

    def get_av_value(self, draw_no):
        """Search for the DRAW NO and return the corresponding AV value from the Excel file."""
        try:
            # Load the Excel file and open the sheet
            wb = openpyxl.load_workbook('SampleAV.xlsx')
            sheet = wb['MergedData']  
            
            # Iterate through rows to find matching DRAW NO
            for row in sheet.iter_rows(min_row=2, max_row=sheet.max_row, min_col=1, max_col=2):
                if row[0].value == draw_no:
                    return row[1].value  # Assuming AV value is in the second column
            return None  # If DRAW NO not found
        except Exception as e:
            print(f"Error reading Excel file: {str(e)}")
            return None

    








# Run the server
def run(server_class=HTTPServer, handler_class=ClockInOutHandler, port=PORT):
    server_address = ('0.0.0.0', port)  # Listen on all interfaces
    httpd = server_class(server_address, handler_class)
    httpd = server_class(server_address, handler_class)
    print(f"🚀 Environment: {ENV}")
    print(f"🌐 Running on port: {port}")
    print(f"✅ Server started on port {port}...")
    httpd.serve_forever()

if __name__ == '__main__':
    run()
