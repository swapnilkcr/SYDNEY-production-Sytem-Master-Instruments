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
from config import ENV, PORT  # Import environment variables
import gzip
import json
from io import BytesIO  



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


DB_NAME = 'clock_in_management.db'



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

def clock_in(staff_name, job_id):
    """Handle clock-in logic."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO ClockInOut (StaffName, JobID, start_time, status) VALUES (?, ?, DATETIME('now'), 'active')", 
                   (staff_name, job_id))
    conn.commit()
    conn.close()

    # Use existing event loop
    '''loop = asyncio.get_event_loop()
    if loop.is_running():
        loop.create_task(send_update("start", staff_name, job_id, "now"))
    else:
        asyncio.run(send_update("start", staff_name, job_id, "now"))'''

def clock_out(staff_name, job_id):
    """Handle clock-out logic."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("UPDATE ClockInOut SET stop_time = DATETIME('now'), status = 'completed' WHERE StaffName = ? AND JobID = ? AND status = 'active'", 
                   (staff_name, job_id))
    conn.commit()
    conn.close()

    # Use existing event loop
    '''loop = asyncio.get_event_loop()
    if loop.is_running():
        loop.create_task(send_update("stop", staff_name, job_id, "now"))
    else:
        asyncio.run(send_update("stop", staff_name, job_id, "now"))'''




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
        #Connect to the database
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()

        # Query to fetch AV and QTY for the given job_id
        cursor.execute('SELECT AV, QTY FROM PN_DATA WHERE PN = ?', (job_id,))
        result = cursor.fetchone()
        conn.close()

        if result:
            av = float(result[0]) if result[0] is not None else 0.0
            qty = float(result[1]) if result[1] is not None else 0.0
            return av * qty  # Estimated time calculation
        else:
            return 0.0  # Return 0 if no matching job_id is found

    except Exception as e:
        print(f"Error fetching estimated time from database: {e}")
        return 0.0

       
# Calculate Total Hours Worked by all users for a job
def get_total_hours_worked(job_id):
    conn = sqlite3.connect('clock_in_management.db')
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
            "customerName": result[0] if result and result[0] else "Unknown",
            "drawingNumber": result[1] if result and result[1] else "Unknown",
            "cellNo": result[2] if result and result[2] else "Unknown",
            "quantity": result[3] if result and result[3] else "Unknown",
            "requiredDate": result[4] if result and result[4] else "Unknown"
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
        cursor.execute('SELECT AV FROM MergedData WHERE StockCode = ?', (stock_code,))
        result = cursor.fetchone()
        conn.close()

        return {'avValue': result[0]} if result else None
    except Exception as e:
        print(f"Error fetching AV from STOCKCODE: {e}")
        return None


    
#from store_merged_data import store_merged_data_to_db

# Call this function during initialization if required
#store_merged_data_to_db()


# Define the HTTP request handler
class ClockInOutHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        # Handle preflight requests for CORS
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('X-Content-Type-Options', 'nosniff')  
        self.end_headers()
    # Add the /view-running-jobs endpoint to the do_GET method
    def do_GET(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')  # Allow all origins
        self.send_header('Cache-Control', 'no-store')  # 🔥 Prevent caching
        self.send_header('Content-Type', 'application/json')
        self.send_header('X-Content-Type-Options', 'nosniff')

        
        if self.path == '/get-staff':
            # Load staff data from the CSV file
            staff_list = load_staff_from_csv('staff.csv')

            # Respond with the staff list
            #self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Cache-Control', 'no-store') 
            self.end_headers()
            response = {'staff': staff_list}
            self.wfile.write(json.dumps(response).encode('utf-8'))

        elif self.path == '/get-jobs':
            try:
                conn = sqlite3.connect(DB_NAME)
                cursor = conn.cursor()

                # Fetch all job details from PN_DATA
                cursor.execute("SELECT PN, CUST FROM PN_DATA")
                jobs = cursor.fetchall()

                conn.close()

                # Convert results into JSON format
                job_records = [{'jobId': row[0], 'customer': row[1]} for row in jobs]

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Cache-Control', 'no-store') 
                self.send_header('X-Content-Type-Options', 'nosniff') 
                self.end_headers()
                response = {'jobs': job_records}
                self.wfile.write(json.dumps(response).encode('utf-8'))

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Cache-Control', 'no-store')
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
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store') 
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))

            
        elif self.path == '/get-totallaborcost':
            try:
                conn = sqlite3.connect('clock_in_management.db')
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
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {'jobs': job_records}
                self.wfile.write(json.dumps(response).encode('utf-8'))

            except Exception as e:
                print(f"Error in /get-totallaborcost: {str(e)}")
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))




        elif self.path == '/view-times':
            try:
                conn = sqlite3.connect('clock_in_management.db')
                cursor = conn.cursor()

                # Optimized SQL query (from previous steps)
                cursor.execute('''
                    SELECT 
                        c.StaffName, 
                        c.JobID, 
                        c.StartTime, 
                        c.StopTime, 
                        c.LaborCost, 
                        j.CUST, j."DRAW NO", j."NO/CELL", j.QTY, j."REQU-DATE",
                        
                        -- Compute Estimated Time from AV * QTY
                        COALESCE(p.AV * j.QTY, 0.0) AS EstimatedTime, 

                        -- Compute Total Hours Worked using SUM in SQL
                        ROUND(COALESCE(SUM(
                            CASE 
                                WHEN c.StopTime IS NOT NULL THEN 
                                    (strftime('%s', c.StopTime) - strftime('%s', c.StartTime)) / 3600.0 
                                ELSE 
                                    (strftime('%s', 'now') - strftime('%s', c.StartTime)) / 3600.0 
                            END
                        ), 0.0),2) AS TotalHoursWorked 

                    FROM ClockInOut c
                    LEFT JOIN PN_DATA j ON c.JobID = j.PN
                    LEFT JOIN MergedData p ON j.PN = p.StockCode
                    GROUP BY c.JobID, c.StaffName
                ''')

                rows = cursor.fetchall()
                conn.close()

                # Process data
                records = [
                    {
                        'staffName': row[0],
                        'jobId': row[1],
                        'startTime': row[2] or 'NA',
                        'stopTime': row[3] if row[3] else "In Progress",
                        'totalHoursWorked': row[11] if row[11] != 0 else "In Progress",
                        'estimatedTime': row[10],
                        'remainingTime': round(row[10] - row[11], 2),
                        'customerName': row[5] or "Unknown",
                        'drawingNumber': row[6] or "Unknown",
                        'cellNo': row[7] or "Unknown",
                        'quantity': row[8] or "Unknown",
                        'laborCost': row[4] if row[4] is not None else "N/A"
                    } for row in rows
                ]

                # Convert JSON to compressed Gzip format
                json_data = json.dumps({'records': records}).encode('utf-8')
                buffer = BytesIO()
                with gzip.GzipFile(fileobj=buffer, mode='wb') as gzip_file:
                    gzip_file.write(json_data)

                compressed_data = buffer.getvalue()

                # Send Gzip response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Encoding', 'gzip')  # Tell browser response is compressed
                self.send_header('Cache-Control', 'no-store')
                self.send_header('Content-Length', str(len(compressed_data)))  # Required for gzip
                self.end_headers()
                self.wfile.write(compressed_data)

            except Exception as e:
                print(f"Error in /view-times: {str(e)}")
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))



        elif self.path == '/view-running-jobs':
            # Fetch running jobs
            try:
                conn = sqlite3.connect('clock_in_management.db')
                cursor = conn.cursor()

                # Query for jobs with StopTime IS NULL
                cursor.execute("""
                    SELECT StaffName, JobID, StartTime
                    FROM ClockInOut
                    WHERE StopTime IS NULL
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
                        'startTime': row[2],
                    })

                # Send response
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Cache-Control', 'no-store')  #Prevents caching
                self.end_headers()

                response = {'runningJobs': running_jobs}
                self.wfile.write(json.dumps(response).encode('utf-8'))

            except Exception as e:
                # Handle errors
                print(f"Error fetching running jobs: {str(e)}")
                self.send_response(500)
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
                self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                self.send_header('Cache-Control', 'no-store')
                self.send_header('Content-Disposition', 'attachment; filename="clock_in_data.xlsx"')
                self.end_headers()
                self.wfile.write(output_stream.read())  # Write the file content to the response

            except Exception as e:
                # Handle errors
                self.send_response(500)
                self.send_header('Cache-Control', 'no-store')
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
                self.send_header('Content-Type', 'application/json')
                self.send_header('Cache-Control', 'no-store')  #Prevents caching
                self.end_headers()
                self.wfile.write(json.dumps(response).encode('utf-8'))

            except Exception as e:
                print(f"Error fetching finished jobs: {str(e)}")
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))


        elif self.path == "/get-config":
            config_data = {"PORT": PORT}
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header('Cache-Control', 'no-store')  #Prevents caching
            self.end_headers()
            self.wfile.write(json.dumps(config_data).encode("utf-8"))


        else:
            self.send_response(404)
            self.send_header('Cache-Control', 'no-store')  #Prevents caching
            self.end_headers()

    

        
    
    def do_POST(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')  # Allow all origins
        self.send_header('Content-Type', 'application/json')
        self.send_header('X-Content-Type-Options', 'nosniff')
        if self.path == '/clock-in':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            data = json.loads(post_data.decode('utf-8'))
            staff_name = data['staffName']
            job_id = data['jobId']
            start_time_str = data['startTime']
            stop_time_str = data['stopTime']

            conn = sqlite3.connect('clock_in_management.db')
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO ClockInOut (StaffName, JobID, StartTime, StopTime)
                VALUES (?, ?, ?, ?)
            ''', (staff_name, job_id, start_time_str, stop_time_str))

            conn.commit()
            conn.close()

            self.send_response(200)
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


                conn = sqlite3.connect('clock_in_management.db')
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO ClockInOut (StaffName, JobID, StartTime, StopTime)
                    VALUES (?, ?, ?, NULL)
                ''', (staff_name, job_id, start_time))

                conn.commit()
                conn.close()

                # Respond with success
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Job started successfully!'}).encode('utf-8'))
            except Exception as e:
                # Handle errors
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))


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
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Job stopped successfully!'}).encode('utf-8'))

            except Exception as e:
                print(f"Error in /stop-job: {e}")  # Log the error
                self.send_response(500)
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
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Staff added successfully!'}).encode('utf-8'))
            except Exception as e:
                # Handle errors
                self.send_response(400)
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

                conn.commit()
                conn.close()

                # Send success response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Job added successfully!'}).encode('utf-8'))

            except Exception as e:
                # Log the error for debugging
                print(f"Error: {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

                
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
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Job added successfully!'}).encode('utf-8'))

            except Exception as e:
                # Handle errors
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

        elif self.path == '/finish-job':
            self.handle_finish_job()

        
        elif self.path == '/move-job':
            print("Handling /move-job request")  # Confirm route hit
            self.handle_move_job()

       
        else:
            self.send_response()
            self.send_response(404)
            self.end_headers()



     #Finish job       
    def handle_finish_job(self):
        import sqlite3
        from datetime import datetime
        import json

        hourly_rate = 25.0  # Fixed hourly labor cost
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))

        staff_name = data.get('staffName')
        job_id = data.get('jobId')

        if not staff_name or not job_id:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(json.dumps({'message': 'Invalid data provided.'}).encode('utf-8'))
            return
        conn = None  # Initialize connection outside try block
        try:
            # Connect to the database
            conn = sqlite3.connect('clock_in_management.db')
            cursor = conn.cursor()

            # Fetch start and stop times
            cursor.execute('''
            SELECT StartTime, StopTime 
            FROM ClockInOut 
            WHERE StaffName = ? AND JobID = ? AND StopTime IS NOT NULL
            ''', (staff_name, job_id))
            record = cursor.fetchone()

            if not record:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Job not found or still in progress.'}).encode('utf-8'))
                return

            start_time, stop_time = record
            total_hours = (datetime.strptime(stop_time, '%Y-%m-%d %H:%M:%S') -
                        datetime.strptime(start_time, '%Y-%m-%d %H:%M:%S')).total_seconds() / 3600

            labor_cost = total_hours * hourly_rate

            # Update the ClockInOut table with labor cost and job status
            cursor.execute('''
            UPDATE ClockInOut
            SET Status = 'completed', LaborCost = ?
            WHERE StaffName = ? AND JobID = ?
            ''', (labor_cost, staff_name, job_id))

            # Calculate the total labor cost for the job
            cursor.execute('''
            SELECT SUM(LaborCost) 
            FROM ClockInOut 
            WHERE JobID = ?
            ''', (job_id,))
            total_labor_cost = cursor.fetchone()[0] or 0

                # Calculate Estimated Time
            estimated_time = calculate_estimated_time(job_id)

            # Calculate Total Hours Worked
            total_hours_worked = get_total_hours_worked(job_id)
            print(f"DEBUG: JobID: {job_id}, EstimatedTime: {estimated_time}, TotalHoursWorked: {total_hours_worked}")

            # Insert or update the total labor cost in JobTable
            cursor.execute('''
            INSERT INTO JobTable (JobID, TotalLaborCost,EstimatedTime,TotalHoursWorked)
            VALUES (?, ?)
            ON CONFLICT(JobID) DO UPDATE SET 
            TotalLaborCost = excluded.TotalLaborCost,
            EstimatedTime = excluded.EstimatedTime,
            TotalHoursWorked = excluded.TotalHoursWorked
            ''', (job_id, total_labor_cost,estimated_time,total_hours_worked))

            conn.commit()
            conn.close()

            # Send a success response
            self.send_response(200)
            self.end_headers()
            self.wfile.write(json.dumps({
                'message': 'Job finished successfully.',
                'laborCost': labor_cost,
                'totalLaborCost': total_labor_cost,
                'estimatedTime': estimated_time,
                'totalHoursWorked': total_hours_worked
            }).encode('utf-8'))

        except sqlite3.Error as db_error:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({'message': 'Database error: ' + str(db_error)}).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({'message': 'Unexpected error: ' + str(e)}).encode('utf-8'))

        finally:
            if conn:  # Close only once, here
                conn.close()



    '''def handle_move_job(self):
        try:
            # Step 1: Read jobId from the POST request
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))

            job_id = data.get('jobId')
            if not job_id:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Job ID is required.'}).encode('utf-8'))
                return
            job_id = str(job_id).strip()  # Remove any leading or trailing spaces

            # Step 2: Load the Excel file
            excel_file = 'Sample.xlsx'
            if not os.path.isfile(excel_file):
                self.send_response(404)
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Sample.xlsx file not found.'}).encode('utf-8'))
                return

            # Open the workbook
            wb = openpyxl.load_workbook(excel_file)

            # Ensure "Sheet1" exists
            if "Sheet1" not in wb.sheetnames:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Sheet1 not found in Sample.xlsx.'}).encode('utf-8'))
                return

            sheet1 = wb["Sheet1"]

            # Step 3: Locate the row with the given jobId in "Sheet1"
            headers = [cell.value for cell in sheet1[1]]  # Get headers from the first row
            if 'PN' not in headers:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'PN column not found in Sheet1 headers.'}).encode('utf-8'))
                return

            pn_index = headers.index('PN')  # Find the column index for 'PN'
            target_row = None

            for row in sheet1.iter_rows(min_row=2, values_only=False):
                pn_value = row[pn_index].value 
                if pn_value and str(pn_value).strip()  == job_id:
                    target_row = [cell.value for cell in row]
                    for cell in row:
                        cell.value = None  # Mark row for deletion
                    break

            if not target_row:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Job ID not found in Sheet1.'}).encode('utf-8'))
                return

            # Step 4: Append the row to the "FINISHED JOBS" sheet
            if "FINISHED JOBS" not in wb.sheetnames:
                wb.create_sheet("FINISHED JOBS")
            finished_sheet = wb["FINISHED JOBS"]

            # Write headers if "FINISHED JOBS" is empty
            if finished_sheet.max_row == 1 and all(cell.value is None for cell in finished_sheet[1]):
                finished_sheet.append(headers)

            # Append the target row
            finished_sheet.append(target_row)

            # Step 5: Remove blank rows from "Sheet1"
            rows_to_keep = [row for row in sheet1.iter_rows(values_only=True) if any(cell is not None for cell in row)]
            sheet1.delete_rows(1, sheet1.max_row)  # Clear Sheet1
            for row in rows_to_keep:
                sheet1.append(row)

            # Step 6: Save the updated Excel file
            wb.save(excel_file)

            # Step 7: Update the FinishedJobs SQLite database
            db_path = 'clock_in_management.db'  # Your SQLite database path
            try:
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()

                # Assuming you have a FinishedJobs table with a 'job_id' column
                cursor.execute("INSERT INTO JOBSFINISHED (JOBID) VALUES (?)", (job_id,))
                conn.commit()
                conn.close()
                print(f"Job {job_id} moved to FinishedJobs database successfully.")
            except sqlite3.Error as db_error:
                print(f"Error updating FinishedJobs database: {db_error}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'message': f'Error updating FinishedJobs database: {db_error}'}).encode('utf-8'))
                return

            # Step 8: Respond with success
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'message': 'Job moved to FINISHED JOBS successfully!'}).encode('utf-8'))

        except Exception as e:
            print(f"Error in handle_move_job: {e}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'message': f'Unexpected error: {e}'}).encode('utf-8'))'''
    
    
    '''def handle_move_job(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))

            job_id = data.get('jobId')
            if not job_id:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Job ID is required.'}).encode('utf-8'))
                return
            job_id = str(job_id).strip()

            with sqlite3.connect(DB_NAME, timeout=30) as conn:
                cursor = conn.cursor()
                
                # Enable WAL mode for better concurrency
                cursor.execute("PRAGMA journal_mode=WAL;")
                cursor.execute("PRAGMA busy_timeout = 3002")

                # Get table columns
                cursor.execute("PRAGMA table_info(PN_DATA)")
                columns_info = cursor.fetchall()
                columns = [col[1] for col in columns_info]  

                # Create JOBSFINISHED table
                create_table_query = f"""
                CREATE TABLE IF NOT EXISTS JOBSFINISHED (
                    {', '.join([f'"{col}" TEXT' for col in columns])},
                    "TotalLaborCost" REAL
                );
                """
                cursor.execute(create_table_query)

                # Fetch job data
                select_query = f"SELECT {', '.join([f'"{col}"' for col in columns])} FROM PN_DATA WHERE PN = ?"
                cursor.execute(select_query, (job_id,))
                job_data = cursor.fetchone()

                if not job_data:
                    self.send_response(404)
                    self.end_headers()
                    self.wfile.write(json.dumps({'message': 'Job ID not found in PN_DATA.'}).encode('utf-8'))
                    return

                # Fetch TotalLaborCost
                labor_cost_result = execute_with_retry(cursor, "SELECT TotalLaborCost FROM JobTable WHERE JobID = ?", (job_id,)) # type: ignore
                total_labor_cost = labor_cost_result[0] if labor_cost_result else 0.0

                # Insert into JOBSFINISHED
                columns.append("TotalLaborCost")
                insert_query = f"INSERT INTO JOBSFINISHED ({', '.join([f'"{col}"' for col in columns])}) VALUES ({', '.join(['?'] * len(columns))})"
                execute_with_retry(cursor, insert_query, job_data + (total_labor_cost,)) # type: ignore

                # Delete from PN_DATA
                execute_with_retry(cursor, "DELETE FROM PN_DATA WHERE PN = ?", (job_id,))
                
                conn.commit()

        except sqlite3.OperationalError as e:
            print(f"Database locked error: {e}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'message': 'Database is locked. Please try again later.'}).encode('utf-8'))

        except Exception as e:
            print(f"Error in handle_move_job: {e}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'message': f'Unexpected error: {e}'}).encode('utf-8'))'''
    

    def handle_move_job(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            job_id = data.get('jobId', '').strip()

            if not job_id:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Job ID is required.'}).encode('utf-8'))
                return

            with sqlite3.connect(DB_NAME, timeout=30) as conn:
                cursor = conn.cursor()

                # 1. Get labor cost first
                execute_with_retry(cursor, 
                    "SELECT TotalLaborCost FROM JobTable WHERE JobID = ?", 
                    (job_id,)
                )
                labor_cost_result = cursor.fetchone()
                labor_cost = labor_cost_result[0] if labor_cost_result else 0.0  # Handle null

                # 2. Get PN_DATA column definitions
                cursor.execute("PRAGMA table_info(PN_DATA)")
                columns = [f'"{col[1]}" {col[2]}' for col in cursor.fetchall()]
                
                # 3. Create JOBSFINISHED table
                create_query = f"""
                    CREATE TABLE IF NOT EXISTS JOBSFINISHED (
                        {', '.join(columns)},
                        TotalLaborCost REAL
                    )
                """
                execute_with_retry(cursor, create_query)

                # 4. Get column names for insert
                column_names = [f'"{col[1]}"' for col in cursor.execute("PRAGMA table_info(PN_DATA)")]
                
                # 5. Insert with all columns
                insert_query = f"""
                    INSERT INTO JOBSFINISHED ({', '.join(column_names)}, TotalLaborCost)
                    SELECT {', '.join(column_names)}, ? 
                    FROM PN_DATA 
                    WHERE PN = ?
                """
                execute_with_retry(cursor, insert_query, (labor_cost, job_id))

                # 6. Delete original
                execute_with_retry(cursor, "DELETE FROM PN_DATA WHERE PN = ?", (job_id,))

                commit_with_retry(conn)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'message': 'Job moved successfully!'}).encode('utf-8'))

        except sqlite3.OperationalError as e:
            print(f"Database error: {e}")
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({'message': 'Database is busy. Please try again.'}).encode('utf-8'))
        except Exception as e:
            print(f"Unexpected error: {e}")
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({'message': 'Server error'}).encode('utf-8'))
    

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
