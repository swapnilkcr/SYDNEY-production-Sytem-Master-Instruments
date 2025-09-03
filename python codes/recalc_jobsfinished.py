import sqlite3

DB_NAME = 'clock_in_management.db'
HOURLY_RATE = 25.0  # Labor cost per hour

def recalculate_jobsfinished():
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()

        # Fetch all jobs from JOBSFINISHED
        cursor.execute('SELECT PN, AV, QTY FROM JOBSFINISHED')
        jobs = cursor.fetchall()

        for job in jobs:
            job_id = job[0]
            av = float(job[1]) if job[1] else 0.0
            qty = float(job[2]) if job[2] else 0.0

            # Debugging: Print fetched AV and QTY
            print(f"Job ID: {job_id}, AV: {av}, QTY: {qty}")

            # Recalculate EstimatedTime
            estimated_time = round(av * qty, 2)

            # Fetch total hours worked for the job
            cursor.execute('''
                SELECT COALESCE(SUM(
                    (strftime('%s', COALESCE(StopTime, 'now')) - strftime('%s', StartTime)) / 3600.0
                ), 0.0)
                FROM ClockInOut WHERE JobID = ?
            ''', (job_id,))
            total_hours_worked = round(cursor.fetchone()[0],2)

            # Calculate RemainingTime
            remaining_time = round(estimated_time - total_hours_worked, 2)

            # Calculate TotalLaborCost
            total_labor_cost = round(total_hours_worked * HOURLY_RATE, 2)

            # Update the JOBSFINISHED table
            cursor.execute('''
                UPDATE JOBSFINISHED
                SET EstimatedTime = ?, TotalHoursWorked = ?, RemainingTime = ?, TotalLaborCost = ?
                WHERE PN = ?
            ''', (estimated_time, total_hours_worked, remaining_time, total_labor_cost, job_id))

            print(f"Updated job {job_id}: EstimatedTime={estimated_time}, TotalHoursWorked={total_hours_worked}, RemainingTime={remaining_time}, TotalLaborCost={total_labor_cost}")

        conn.commit()
        print("All jobs recalculated successfully.")

    except sqlite3.Error as e:
        print(f"Database error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    recalculate_jobsfinished()