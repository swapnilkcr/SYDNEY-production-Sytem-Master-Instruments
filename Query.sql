SELECT * FROM csv_data WHERE Drawing_Number = 'AL44-T';
PRAGMA table_info(PN_DATA);
drop table csv_data;
.tables
INSERT INTO Users (username, password) 
VALUES ('Admin', 'Password123');
select * from MergedData;
select * FROM ClockInOut;
select * from Users;
select * from JobTable;
select * from JOBSFINISHED;
select * from csv_data;
SELECT RecordID, JobID, StartTime, StopTime, LaborCost FROM ClockInOut ORDER BY StopTime DESC LIMIT 5;

SELECT RecordID, StaffName, JobID, StartTime, StopTime FROM ClockInOut WHERE StopTime IS NOT NULL;

SELECT RecordID, LaborCost FROM ClockInOut WHERE LaborCost IS NOT NULL;
Select RecordID From ClockInOut;

dELETE FROM ClockInOut;

SELECT * FROM ClockInOut WHERE JobID = 312052;
.tables
SELECT JobID, StartTime, StopTime FROM ClockInOut WHERE JobID = 312052;

function fetchPNData() {
  console.log("Fetching PN_DATA...");
  fetch(`${backendBaseUrl}/get-pn-data`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
  })
  .then(response => {
      console.log("Response status:", response.status);
      if (!response.ok) {
          throw new Error(`Failed to fetch PN_DATA: ${response.status}`);
      }
      return response.json();
  })
  .then(data => {
      console.log("PN_DATA fetched successfully:", data);
      const tableBody = document.getElementById('pn-data-table-body');
      if (!tableBody) {
          console.error("Table body element not found!");
          return;
      }
      tableBody.innerHTML = ''; // Clear existing rows

      // Check if data is an array (multiple records) or a single object
      const records = Array.isArray(data) ? data : [data];

      // Populate the table with data
      records.forEach(row => {
          const tr = document.createElement('tr');

          // Check if the date is near or past due
          const isNearOrPastDue = isDateNearOrPassed(row['REQU-DATE']);
          if (isNearOrPastDue) {
              tr.classList.add('date-warning'); // Add a CSS class for highlighting
          }

          // Create cells for each property
          Object.values(row).forEach(value => {
              const td = document.createElement('td');
              td.textContent = value || 'N/A';
              tr.appendChild(td);
          });
          tableBody.appendChild(tr);
      });
  })
  .catch(error => {
      console.error("Error fetching PN_DATA:", error);
  });
}
SELECT INPUT DATE, PN, DRAW NO, CUST, REQU-DATE FROM PN_DATA;
.TABLES
select * from csv_data where Drawing_Number = 'AL44';
Delete FROM PN_DATA WHERE DISCOUNT= 0.0;
select * from Csv_Data;
.tables


SELECT JobID, StartTime, StopTime FROM ClockInOut WHERE JobID = 312052;

SELECT JobID, LaborCost, Status FROM ClockInOut;


ALTER TABLE ClockInOut ADD COLUMN LaborCost REAL;

ALTER TABLE ClockInOut ADD COLUMN Status TEXT;

SELECT StartTime, StopTime,LaborCost FROM ClockInOut WHERE JobID = '312052';

CREATE TABLE JobTable (
    JobID INTEGER PRIMARY KEY,
    TotalLaborCost REAL DEFAULT 0
);

.tables
SELECT TotalLaborCost from JobTable WHERE JobID = '312052';
PRAGMA TABLE_INFO(JobTable);
PRAGMA TABLE_INFO(FinishedJobs);

SELECT  * FROM JobTable;

SELECT * from ClockInOut;
SELECT * from PN_DATA;

SELECT JobID, TotalLaborCost FROM JobTable

CREATE TABLE FinishedJobs (
    JobID INTEGER PRIMARY KEY,
    TotalLaborCost REAL
);

DELETE  FROM clockInOut;

.tables
Select * From ClockInOut;
Select * from JobTable;

EXPLAIN QUERY PLAN 
SELECT * FROM ClockInOut WHERE StopTime IS NULL;

EXPLAIN QUERY PLAN 
SELECT * FROM ClockInOut c
LEFT JOIN PN_DATA j ON c.JobID = j.PN
LEFT JOIN MergedData p ON j.PN = p.StockCode;

CREATE INDEX idx_ClockInOut_JobID ON ClockInOut (JobID);
CREATE INDEX idx_PN_DATA_PN ON PN_DATA (PN);
CREATE INDEX idx_MergedData_StockCode ON MergedData (StockCode);

PRAGMA index_list('ClockInOut');
CREATE INDEX idx_ClockInOut_StartTime ON ClockInOut (StartTime);
CREATE INDEX idx_ClockInOut_JobID ON ClockInOut (JobID);
CREATE INDEX idx_ClockInOut_StopTime ON ClockInOut (StopTime);


EXPLAIN QUERY PLAN 
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
    COALESCE(p.AV * j.QTY, 0.0) AS EstimatedTime,
    ROUND(COALESCE(
        (strftime('%s', c.StopTime) - strftime('%s', c.StartTime)) / 3600.0, 0.0
    ),2) AS TotalHoursWorked 
FROM ClockInOut c
LEFT JOIN PN_DATA j ON c.JobID = j.PN
LEFT JOIN MergedData p ON j.PN = p.StockCode
ORDER BY c.StartTime;


EXPLAIN QUERY PLAN 
SELECT * FROM ClockInOut WHERE StartTime > datetime('now', '-30 days');

DELETE FROM PN_DATA where PN = 'C004';

select * from JobTable;
CREATE INDEX idx_job_id ON ClockInOut(JobID);
CREATE INDEX idx_start_time ON ClockInOut(StartTime);
CREATE INDEX idx_stop_time ON ClockInOut(StopTime);


PRAGMA journal_mode = WAL;  -- Better concurrency
PRAGMA synchronous = NORMAL; -- Reduces disk I/O
PRAGMA cache_size = 10000;   -- Improves caching
PRAGMA temp_store = MEMORY;  -- Keeps temp tables in RAM


Select * from ClockInOut;



PRAGMA TABLE_INFO(ClockInOut);

CREATE TABLE IF NOT EXISTS MergedData (
    DrawNo TEXT PRIMARY KEY,
    AV REAL,
    STOCKCODE TEXT
);
DROP TABLE MergedData
PRAGMA TABLE_INFO(MergedData)

.tables

select * from Users;
select * from ClockInOut;
SELECT * FROM MergedData;

SELECT * FROM JOBSFINISHED;

SELECT * from PN_DATA;
SELECT PN, AV, QTY FROM PN_DATA WHERE PN IN ('318425', '320026', '320629', '320791');

SELECT * FROM ClockInOut;

SELECT PN, CUST FROM PN_DATA;

.tables
SELECT * FROM JobTable;

SELECT * FROM Users;


ALTER TABLE JobTable ADD COLUMN EstimatedTime REAL;
ALTER TABLE JobTable ADD COLUMN TotalHoursWorked REAL;


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

    -- Compute Estimated Time from AV * QTY
    COALESCE(p.AV * j.QTY, 0.0) AS EstimatedTime, 

    -- Compute Total Hours Worked PER ENTRY
    ROUND(COALESCE(
        (strftime('%s', c.StopTime) - strftime('%s', c.StartTime)) / 3600.0, 0.0
    ),2) AS TotalHoursWorked 

FROM ClockInOut c
LEFT JOIN PN_DATA j ON c.JobID = j.PN
LEFT JOIN MergedData p ON j.PN = p.StockCode

ORDER BY c.StartTime;


SELECT RecordID, StaffName, JobID, StartTime, StopTime, LaborCost 
FROM ClockInOut 
WHERE StopTime IS NOT NULL 
ORDER BY StopTime DESC 
LIMIT 5;

.tables


SELECT * FROM ClockInOut;

UPDATE ClockInOut SET LaborCost = 10.75 WHERE JobID = '333240';
SELECT RecordID, StaffName, JobID, LaborCost FROM ClockInOut WHERE JobID = '333240';

SELECT * FROM ClockInOut WHERE JobID = '345688';
ALTER TABLE ClockInOut ADD COLUMN LaborCost REAL;


SELECT * FROM ClockInOut WHERE status = 'active';


PRAGMA table_info(ClockInOut);

SELECT RecordID, StaffName, JobID, StartTime, StopTime, LaborCost FROM ClockInOut WHERE JobID = '326264';


SELECT * FROM ClockInOut WHERE StaffName = 'TIN' AND JobID = '328741';
SELECT * FROM ClockInOut WHERE Status = 'active';


INSERT INTO ClockInOut (StaffName, JobID, StartTime, Status) 
VALUES ('SWAPNIL', '328741', '2025-02-25 09:00:00', 'active');

.tables
pragma table_info(PN_DATA);
select * from PN_DATA where PN = '323793';

select * from csv_data;


UPDATE csv_data
SET Drawing_Number = SUBSTR(Drawing_Number, 1, LENGTH(Drawing_Number) - 2)
WHERE Drawing_Number LIKE '%-T';



select * from PN_DATA where "DRAW NO "= 'RECELL';




EXPLAIN QUERY PLAN
SELECT COUNT(*) FROM ClockInOut;
Select * from MergedData;
LEFT JOIN MergedData p ON j.PN = p.StockCode


CREATE INDEX idx_clockinout_job ON ClockInOut (JobID);
CREATE INDEX idx_clockinout_staff ON ClockInOut (StaffName);
CREATE INDEX idx_pndata_pn ON PN_DATA (PN);
CREATE INDEX idx_mergeddata_stock ON MergedData (StockCode);


CREATE INDEX idx_clockinout_jobid ON ClockInOut(JobID);
CREATE INDEX idx_pndata_pn ON PN_DATA(PN);




ALTER TABLE JOBSFINISHED ADD COLUMN RemainingTime REAL DEFAULT 0.0;
ALTER TABLE JobTable 
    ADD COLUMN RemainingTime REAL DEFAULT 0.0
ALTER TABLE JOBSFINISHED ADD COLUMN TotalHoursWorked REAL DEFAULT 0;

select * from JobsFinished;

PRAGMA table_info(JOBSFINISHED);
select * from JobTable;

SELECT * FROM ClockInOut WHERE JobID = '7ABCD';
SELECT * FROM PN_DATA WHERE PN = '7ABCD';


SELECT * FROM JOBSFINISHED WHERE PN = '7ABCD';
SELECT * FROM JobTable WHERE JobID = '7ABCD';


Select * from JobTable;

SELECT * FROM PN_DATA WHERE PN = '7ABCD';  -- Job details table
SELECT * FROM ClockInOut WHERE JobID = '7ABCD';  -- Clock-in records
SELECT * FROM JOBSFINISHED WHERE PN = '7ABCD';  -- Completed jobs



Delete JobID_New from JobTable;
PRAGMA table_info(JobTable);
PRAGMA table_info(PN_DATA);

SELECT * FROM JobTable;
INSERT INTO JobTable (JobID, TotalLaborCost, EstimatedTime, TotalHoursWorked, RemainingTime)
SELECT PN, 0.0, 0.0, 0.0, 0.0 FROM PN_DATA WHERE PN NOT IN (SELECT JobID FROM JobTable);


ALTER TABLE JobTable ADD COLUMN JobID_New TEXT;
UPDATE JobTable SET JobID_New = JobID;
ALTER TABLE JobTable DROP COLUMN JobID;
ALTER TABLE JobTable RENAME COLUMN JobID_New TO JobID;


CREATE TABLE JobTable (
    JobID TEXT PRIMARY KEY,
    TotalLaborCost REAL DEFAULT 0,
    EstimatedTime REAL,
    TotalHoursWorked REAL,
    RemainingTime REAL DEFAULT 0.0
);


INSERT INTO JobTable (JobID, TotalLaborCost, EstimatedTime, TotalHoursWorked, RemainingTime)
SELECT PN, 0, 0, 0, 0 FROM PN_DATA WHERE PN NOT IN (SELECT JobID FROM JobTable);


Select * from JobTable;
select * from ClockInOut;
select * from PN_DATA;
ALTER TABLE JobTable ADD COLUMN Status TEXT

Update PN_DATA SET "REQU-DATE" = '2025-03-25' WHERE PN = '322118';
PRAGMA table_info(PN_DATA);

select * fr

.tables
delete from ClockInOut;
select * from ClockInOut;
Delete from JobTable;
Delete from JobsFinished;



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
                    WHEN f.Status = 'Completed' THEN 'Completed'
                    WHEN j.Status = 'Finished' THEN 'Finished'
                    ELSE 'Active'
                    END AS Status
                FROM ClockInOut c
                LEFT JOIN PN_DATA j ON c.JobID = j.PN
                LEFT JOIN JOBSFINISHED f ON c.JobID = f.PN
                '''

Select * from JobTable;
Select * from PN_DATA;
Select * from PN_DATA where PN = '347004';
select * from MergedData;

.tables
UPDATE csv_data
SET Drawing_Number = REPLACE(Drawing_Number, '-T', '')
WHERE Drawing_Number LIKE '%-T';

SELECT 
    c.*, 
    p.CUST
FROM 
    ClockInOut c
JOIN 
    PN_DATA p
ON 
    c.JobID = p.PN;'





select * from PN_DATA where PN='WAQC';


PRAGMA TABLE_INFO(PN_DATA)
.tables

SELECT INPUT DATE', PN,'DRAW NO', CUST, 'REQU-DATE', 'AV', 'Order Date' FROM PN_DATA;

SELECT "INPUT DATE", PN,"DRAW NO" , CUST, "REQU-DATE", AV, "Order Date" FROM PN_DATA;

select * from PN_DATA where CUST = 'RADLINK COMMUNICATIONS';


UPDATE PN_DATA SET "INPUT DATE" = 2024-04-28 WHERE PN = 'WAQC';
select * from PN_DATA;

CREATE TABLE IF NOT EXISTS AllocatedJobs (
    AllocationID INTEGER PRIMARY KEY AUTOINCREMENT,
    JobID TEXT NOT NULL,
    StaffName TEXT NOT NULL,
    AllocationDate TEXT NOT NULL
);


'''
select * from AllocatedJobs;
.tables

ALTER TABLE AllocatedJobs ADD COLUMN CustomerName TEXT;

UPDATE AllocatedJobs
SET CustomerName = (
    SELECT CUST
    FROM PN_DATA
    WHERE PN_DATA.PN = AllocatedJobs.JobID
);

PRAGMA table_info(AllocatedJobs);

select * from JobTable;
.tables

select * from JobsFinished;
Pragma table_info(JOBSFINISHED);

select * from csv_data;

select * from MergedData;
.tables
select * from PROD_TEST_RECORDS;
pragma table_info(PROD_TEST_RECORDS);
pragma table_info(JOBSFINISHED);


CREATE TABLE IF NOT EXISTS PROD_TEST_RECORDS (
    pn TEXT PRIMARY KEY,
    test_time REAL DEFAULT 0,
    picture BLOB,
    FOREIGN KEY (pn) REFERENCES JOBSFINISHED(pn)
)

ALTER TABLE TestRecords ADD COLUMN has_pdf INTEGER DEFAULT 0;
PRAGMA table_info(TestRecords);

DROP TABLE IF EXISTS TestRecords
INSERT OR REPLACE INTO TestRecords (
    date, PN, draw_no, cells, customer, qty, av, unit_price, bill_price,
    estimated_time, total_time, remaining_time, test_time, stock_code,
    total_labor_cost, salesman, customer_code, order_no, profit, staff_details
)
SELECT 
    j."INPUT DATE" as date,
    j.PN,
    j."DRAW NO" as draw_no,
    CAST(j."NO/CELL" AS INTEGER) as cells,
    j.CUST as customer,
    CAST(j.QTY AS REAL) as qty,
    CAST(j.AV AS REAL) as av,
    CAST(j."S$" AS REAL) as unit_price,
    CAST(j."B$" AS REAL) as bill_price,
    j.EstimatedTime as estimated_time,  
    j.TotalHoursWorked as total_time,
    j.RemainingTime as remaining_time,
    (
        SELECT ROUND(SUM(
            (strftime('%s', COALESCE(StopTime, 'now')) - strftime('%s', StartTime)) / 3600.0
        ), 2)
        FROM ClockInOut
        WHERE JobID = j.PN AND StaffName = 'QC'
    ) as test_time,
    j."STOCK CODE" as stock_code,
    j.TotalLaborCost as total_labor_cost,
    j.SALESMAN as salesman,
    j."Customer Code" as customer_code,
    j."ORDER NO" as order_no,
    (CAST(j."S$" AS REAL) * CAST(j.QTY AS REAL) - CAST(j."B$" AS REAL) * CAST(j.QTY AS REAL) - j.TotalLaborCost) as profit,
    '{}' -- Placeholder for staff_details
FROM JOBSFINISHED j;

DELETE from TestRecords where PN = '123';
Se
select * from TestRecords where PN = '347757';
.tables

ALTER TABLE TestRecords ADD COLUMN staff_details TEXT;

Delete from PN_DATA where PN = 'Test-15/04';
PRAGMA table_info(TestRecords);
PRAGMA table_info(JOBSFINISHED);


select * from ClockInOut;
select * from TestRecords;
PRAGMA integrity_check;
select * from csv_data where PN = 301213;







/* Updating Drawing number after a job is finished */
UPDATE JOBSFINISHED
SET "DRAW NO" = 'RECELL123'
WHERE PN = 'Test-17/04_03';

UPDATE csv_data
SET Drawing_Number = 'RECELL123'
WHERE PN = 'Test-17/04_03';

UPDATE TestRecords
SET draw_no = 'RECELL123'
WHERE PN = 'Test-17/04_03';
WHERE PN = ?;

pragma table_info(PN_DATA);

select * from PN_DATA;

UPDATE PN_DATA
SET "WH" = round((COALESCE(VOL, 0) * COALESCE(AH, 0)),2);

UPDATE JOBSFINISHED
SET "WH" = round((COALESCE(VOL, 0) * COALESCE(AH, 0)),2);

select * from csv_data;
select * from PN_DATA where PN= '347813';


SELECT 
    j."END DATE" as date,
    j.PN,
    j."DRAW NO" as draw_no,
    CAST(j."NO/CELL" AS INTEGER) as cells,
    j.CUST as customer,
    CAST(j.QTY AS REAL) as qty,
    CAST(j.AV AS REAL) as av,
    CAST(j."S$" AS REAL) as unit_price,
    CAST(j."B$" AS REAL) as bill_price,
    j.EstimatedTime as estimated_time,  
    j.TotalHoursWorked as total_time,
    j.RemainingTime as remaining_time,
    (
        SELECT ROUND(SUM(
            (strftime('%s', COALESCE(StopTime, 'now')) - strftime('%s', StartTime)) / 3600.0
        ), 2)
        FROM ClockInOut
        WHERE JobID = j.PN AND StaffName = 'QC'
    ) as test_time,
    j."STOCK CODE" as stock_code,
    j.TotalLaborCost as total_labor_cost,
    j.SALESMAN as salesman,
    j."Customer Code" as customer_code,
    j."ORDER NO" as order_no,
    (CAST(j."S$" AS REAL) * CAST(j.QTY AS REAL) - CAST(j."B$" AS REAL) * CAST(j.QTY AS REAL) - j.TotalLaborCost) as profit,
    '{}' -- Placeholder for staff_details
FROM JOBSFINISHED j
ORDER BY j."END DATE" DESC;  -- Ensures the latest date is first



UPDATE TestRecords
SET "END DATE" = strftime('%Y-%m-%d %H:%M:%S', "END DATE")
WHERE "END DATE" IS NOT NULL;


select * from TestRecords
pragma table_info(TestRecords);
pragma table_info(JOBSFINISHED);


UPDATE TestRecords
SET date = (
    SELECT j."END DATE"
    FROM JOBSFINISHED j
    WHERE j.PN = TestRecords.PN
)
WHERE TestRecords.PN IS NOT NULL;

select * from TestRecords;

select * from PN_DATA where PN = '347859';

UPDATE JOBSFINISHED
SET "TEST TIME" = (
    SELECT ROUND(SUM(
        (strftime('%s', COALESCE(c.StopTime, 'now')) - strftime('%s', c.StartTime)) / 3600.0
    ), 2)
    FROM ClockInOut c
    WHERE c.JobID = JOBSFINISHED.PN
      AND LOWER(c.StaffName) LIKE '%qc%'
)
WHERE EXISTS (
    SELECT 1
    FROM ClockInOut c
    WHERE c.JobID = JOBSFINISHED.PN
      AND LOWER(c.StaffName) LIKE '%qc%'
);



SELECT SUM(
                            (strftime('%s', COALESCE(StopTime, 'now')) - strftime('%s', StartTime)) / 3600.0
                        )
                        FROM ClockInOut
                        WHERE JobID = ?
                        AND LOWER(StaffName) LIKE '%qc%'


                

 (
                    SELECT ROUND(SUM(
                        (strftime('%s', COALESCE(StopTime, 'now')) - strftime('%s', StartTime)) / 3600.0
                    ), 2)
                    FROM ClockInOut
                    WHERE JobID = j.PN AND StaffName = 'QC'
                ) as test_time


UPDATE JOBSFINISHED
SET "TEST TIME" = (
    SELECT 
        ROUND(SUM(
            (strftime('%s', COALESCE(c.StopTime, 'now')) - strftime('%s', c.StartTime)
        ) / 3600.0), 2)
    FROM ClockInOut c
    WHERE c.JobID = JOBSFINISHED.PN
      AND LOWER(c.StaffName) LIKE '%qc%'
)
WHERE PN IN (
    SELECT DISTINCT JobID
    FROM ClockInOut
    WHERE LOWER(StaffName) LIKE '%qc%'
);


UPDATE JOBSFINISHED
SET "TEST TIME" = (
    SELECT 
        CASE 
            WHEN COUNT(*) > 0 THEN ROUND(SUM(
                (strftime('%s', COALESCE(c.StopTime, 'now')) - strftime('%s', c.StartTime)
            ) / 3600.0), 2)
            ELSE ' '
        END
    FROM ClockInOut c
    WHERE c.JobID = JOBSFINISHED.PN
      AND LOWER(c.StaffName) LIKE '%qc%'
);


select * from clockInOut where JobID = '347009';



UPDATE JOBSFINISHED
SET STAFF = (
    SELECT 
        GROUP_CONCAT(DISTINCT c.StaffName)
    FROM ClockInOut c
    WHERE c.JobID = JOBSFINISHED.PN
)
WHERE EXISTS (
    SELECT 1
    FROM ClockInOut c
    WHERE c.JobID = JOBSFINISHED.PN
);


UPDATE JOBSFINISHED
SET TOTALLABORCOST = round(TOTALLABORCOST, 2)
WHERE TOTALLABORCOST IS NOT NULL;


UPDATE JOBSFINISHED
SET REMAININGTIME = round(REMAININGTIME, 2)
WHERE REMAININGTIME IS NOT NULL;


UPDATE JOBSFINISHED
SET REMAININGTIME = round(REMAININGTIME, 2)
WHERE REMAININGTIME IS NOT NULL;



.tables
pragma table_info(JOBSFINISHED);


DELETE FROM JOBSFINISHED WHERE PN = 'Test-test';
DELETE FROM TESTRECORDS WHERE PN = 'Test-test';

UPDATE TestRecords
SET DATE = (
    SELECT "REQU-DATE"
    FROM JOBSFINISHED
    WHERE JOBSFINISHED.PN = TestRecords.pn
)
WHERE (DATE IS NULL OR TRIM(DATE) = '')
AND EXISTS (
    SELECT 1
    FROM JOBSFINISHED
    WHERE JOBSFINISHED.PN = TestRecords.pn
);


UPDATE TestRecords
SET DATE = (
    SELECT SUBSTR("REQU-DATE", 1, 10)
    FROM JOBSFINISHED
    WHERE JOBSFINISHED.PN = TestRecords.pn
)
WHERE (DATE IS NULL OR TRIM(DATE) = '')
AND EXISTS (
    SELECT 1
    FROM JOBSFINISHED
    WHERE JOBSFINISHED.PN = TestRecords.pn
);

UPDATE TestRecords
SET unit_price = REPLACE(unit_price, '$', ''),
    bill_price = REPLACE(bill_price, '$', '')
WHERE unit_price LIKE '$%' OR bill_price LIKE '$%';


UPDATE JOBSFINISHED
SET "MODEL" = " " 
WHERE "MODEL" IS NULL;

PRAGMA table_info(TestRecords);
select * from TestRecords;


select * from clockInOut; where JobID = '347009';

select * from PN_DATA; where JobID = '347009';

SELECT c.StaffName, c.JobID, j.CUST,j."DRAW NO", c.StartTime
                    FROM ClockInOut c
                    LEFT JOIN PN_DATA j ON c.JobID = j.PN
                    WHERE c.StopTime IS NULL

select * from JobTable;
select * from TestRecords where PN = '330568';
select * from PROD_TEST_RECORDS; where pn = '330568';
.tables
PRAGMA table_info(PN_DATA);
pragma_table_info(ClockInOut);
pragma_table_info(JOBSFINISHED);
PRAGMA table_info(TestRecords);
pragma_table_info(csv_data);

ALTER TABLE PN_DATA ADD COLUMN "PRODUCTION READY DATE" TEXT;

ALTER TABLE JOBSFINISHED ADD COLUMN "PRODUCTION READY DATE" TEXT;


UPDATE TestRecords
SET remaining_time = estimated_time - total_time;


PRAGMA table_info(TestRecords);

SELECT PN, unit_price, bill_price, total_labor_cost
FROM TestRecords
WHERE unit_price LIKE '$%' OR bill_price LIKE '$%' OR total_labor_cost LIKE '$%';



UPDATE TestRecords
SET total_time = (
    SELECT ROUND(SUM(
        (strftime('%s', COALESCE(StopTime, 'now')) - strftime('%s', StartTime)) / 3600.0
    ), 2)
    FROM ClockInOut
    WHERE JobID = :job_id
)
WHERE PN = 349218;

-- Recalculate remaining_time for the job
UPDATE TestRecords
SET remaining_time = estimated_time - total_time
WHERE PN = 349218;

-- Recalculate profit for the job
UPDATE TestRecords
SET profit = (unit_price * qty) - (bill_price * qty) - total_labor_cost
WHERE PN = 349218;


select * from PN_DATA where PN = '350501';

Create Table Staff (
    StaffID INTEGER PRIMARY KEY,
    StaffName TEXT NOT NULL
);

INSERT INTO Staff (StaffName) VALUES
('Abraham'),
('Alexander'),
('Binay'),
('Christopher'),
('Cong'),
('Guled'),
('Jacque'),
('Joe'),
('Kim'),
('Leena'),
('Luke'),
('Mai'),
('Margie'),
('Mark'),
('Nalini'),
('Ngoc'),
('Peter'),
('Phuong'),
('Randolf'),
('Robert'),
('Sahreen'),
('Samuel'),
('Tek'),
('Thi'),
('Timothy'),
('Tin'),
('Triveni'),
('Tuan'),
('Van'),
('Vy'),
('Chi'),
('Vi'),
('David'),
('Sandeep'),
('Cliff');


select * from Staff;

.tables;
CREATE TABLE IF NOT EXISTS Staff (
    StaffID   INTEGER PRIMARY KEY AUTOINCREMENT,
    StaffName TEXT NOT NULL UNIQUE
);


INSERT INTO Staff (StaffName) VALUES
('Abraham'),
('Alexander'),
('Binay'),
('Christopher'),
('Cong'),
('Guled'),
('Jacque'),
('Joe'),
('Kim'),
('Leena'),
('Luke'),
('Mai'),
('Margie'),
('Mark'),
('Nalini'),
('Ngoc'),
('Peter'),
('Phuong'),
('Randolf'),
('Robert'),
('Sahreen'),
('Samuel'),
('Tek'),
('Thi'),
('Timothy'),
('Tin'),
('Triveni'),
('Tuan'),
('Van'),
('Vy'),
('Chi'),
('Vi'),
('David'),
('Sandeep'),
('Cliff');


select * from Staff;