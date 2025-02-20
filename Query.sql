
PRAGMA table_info(MergedData);


INSERT INTO Users (username, password) 
VALUES ('Admin', 'Password123');

select * FROM ClockInOut;
select * from Users;

SELECT * FROM ClockInOut WHERE JobID = 312052;
.tables
SELECT JobID, StartTime, StopTime FROM ClockInOut WHERE JobID = 312052;

SELECT * FROM PN_DATA;
.TABLES

Delete FROM PN_DATA WHERE DISCOUNT= 0.0;



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

SELECT * FROM MergedData;

SELECT * FROM JOBSFINISHED;

SELECT * from PN_DATA;

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




