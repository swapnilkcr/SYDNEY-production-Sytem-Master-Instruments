



let BASE_URL = "";  // Placeholder for dynamic port

const frontendBaseUrl = window.location.origin; // This will get the frontend's domain and port

// Now, build the backend URL dynamically based on the frontend's origin
//const backendBaseUrl = frontendBaseUrl.replace(window.location.port, '3003'); 

const urlParams = new URLSearchParams(window.location.search);
let env = urlParams.get('env'); // Get environment from URL

// Detect if running from file:// (no HTTP origin)
if (!env) {
  if (window.location.protocol === "file:") {
    // Check the file path to determine the environment
    const filePath = window.location.pathname || window.location.href;

    if (filePath.includes("Clock_In_test")) {
      env = "test"; // Set to test environment
      console.warn("⚠️ Running from Test file path, defaulting to Test mode.");
    } else if (filePath.includes("Clock_In_prod")) {
      env = "prod"; // Set to prod environment
      console.warn("⚠️ Running from Prod file path, defaulting to Prod mode.");
    } else {
      env = "test"; // Default to test if path doesn't match
      console.warn("⚠️ Running from file://, but path not recognized. Defaulting to Test mode.");
    }
  } else {
    // Fallback for non-file:// protocols
    env = window.location.port === "4003" ? "test" : "prod";
  }
}

// Set backend based on environment
const BACKEND_IP = "10.0.0.80";
/*const backendBaseUrl = env === "test" 
  ? `http://${BACKEND_IP}:3003`  // Test backend
  : `http://${BACKEND_IP}:3000`; // Prod backend*/

const backendBaseUrl = `http://10.0.0.80:${env === "test" ? 4003 : 4000}`;

console.log(`🔄 Detected Environment: ${env}`);
console.log(`🔗 Backend Base URL: ${backendBaseUrl}`);

document.addEventListener("DOMContentLoaded", fetchStaff);
document.addEventListener("DOMContentLoaded", fetchJobs);

window.addEventListener('beforeunload', (event) => {
  console.warn("🚨 Page is about to reload! Possible cause detected.");
});

let fetchConfigCalled = false; // Prevent multiple calls

function fetchConfig() {
  if (fetchConfigCalled) {
    console.warn("⚠️ fetchConfig() already called! Skipping.");
    return;
  }
  fetchConfigCalled = true; // Mark as called
  console.log("🔄 Calling fetchConfig()...");

  fetch(`${backendBaseUrl}/get-config`)
    .then(response => {
      if (!response.ok) throw new Error(`Failed to fetch config: ${response.statusText}`);
      return response.json();
    })
    .then(config => {
      BASE_URL = config.base_url || backendBaseUrl;
      console.log("✅ Backend URL:", BASE_URL);

      // TEST: Check if calling fetchStaff() or fetchJobs() causes refresh
      console.log("⏳ Calling fetchStaff()...");
      fetchStaff();  // Comment this line if refresh persists

      console.log("⏳ Calling fetchJobs()...");
      fetchJobs();  // Comment this line if refresh persists
    })
    .catch(error => {
      console.error('❌ Error fetching config:', error);
      fetchConfigCalled = false; // Allow retry only if needed

      BASE_URL = backendBaseUrl;
      console.warn("⚠️ Using fallback BASE_URL:", BASE_URL);
    });
}


window.onload = function () {
  //fetchConfig();
};
let currentPage = 1;
let lastSeenId = 0; // Stores the last record ID seen


function resetTableHeaders(columnNames) {
  const thead = document.querySelector('#records-table thead');
  const tbody = document.querySelector('#records-table tbody');

  thead.innerHTML = '';
  tbody.innerHTML = '';

  const headerRow = document.createElement('tr');
  columnNames.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
}

document.addEventListener('DOMContentLoaded', (event) => {
  const username = localStorage.getItem('username') || 'Unknown User';
  const userRole = localStorage.getItem('userRole') || 'Unknown Role';
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');



  // Display the logged-in user info
  const userInfoDiv = document.getElementById('user-info');
  userInfoDiv.textContent = `${username} (${userRole})`;

  // Hide admin-only buttons for non-admin users
  const adminOnlyElements = document.querySelectorAll('[data-role="admin-only"]');
  if (userRole !== 'admin') {
    adminOnlyElements.forEach(element => {
      element.style.display = 'none'; // Hide elements
    });
  }

  console.log(`Logged in as: ${username} (Role: ${userRole})`);
  document.querySelector('.filter-container').style.display = 'none';
  document.getElementById('records-table').style.display = 'none';
  document.getElementById('pagination-controls').style.display = 'none';
  fetchConfig();
  //let currentPage = 1;
  const pageSize = 10;
  let currentFilters = {
    column: 'all',
    value: ''
  };
  updateFilterPlaceholder();
  document.getElementById('clear-filters').addEventListener('click', clearFilters);
  document.getElementById('filter-input').addEventListener('keyup', debounce(filterTable, 300));
  /*document.getElementById('filter-column').addEventListener('change', filterTable);*/
  document.getElementById('filter-column').addEventListener('change', () => {
    updateFilterPlaceholder();
    filterTable();
  });
  document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      fetchRecords();
    }
  });
  document.getElementById('next-page').addEventListener('click', () => {
    currentPage++;
    fetchRecords();
  });
  updateFilterPlaceholder();
  //document.getElementById('clear-filter1').addEventListener('click', clearFilter1);


  /*csv_data.html */
  document.querySelector('[data-action="view-csv"]').addEventListener('click', (e) => {
    e.preventDefault();
    navigateToCSVDataPage();
  });

  //TOggle expand/collapse
  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('expand-btn')) {
      const button = e.target;
      const row = button.closest('tr');
      const expandedRow = row.nextElementSibling;

      if (expandedRow.style.display === 'none') {
        expandedRow.style.display = 'table-row';
        button.textContent = '-';
      } else {
        expandedRow.style.display = 'none';
        button.textContent = '+';
      }
    }
  });

  /*window.addEventListener('popstate', (event) => {
    event.preventDefault();
    // Redirect back to the layout page if the user presses the back button
    if (window.location.pathname === '/layout.html') {
      console.warn("⚠️ history.replaceState() is running");
      history.replaceState(null, null, window.location.href);
    }
  })*/



  const staffSelect = document.getElementById('staff-select');
  const jobSelect = document.getElementById('job-select');
  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  const viewBtn = document.getElementById('view-btn');
  const resetBtn = document.getElementById('reset-btn');
  const exportBtn = document.getElementById('export-btn');
  const viewRunningJobsBtn = document.getElementById('view-running-jobs-btn'); // Button for running jobs
  const recordsTable = document.getElementById('records-table');
  const tableBody = recordsTable.querySelector('tbody');  // Table body for records
  const messageDiv = document.getElementById('message');
  const finishBtn = document.getElementById('finish-btn');





  const activeSessions = {};  // Track active sessions



  function clearTable() {
    tableBody.innerHTML = '';
  }

  // Function to format date to human-readable format
  function formatDate(date) {
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };
    return new Date(date).toLocaleString('en-US', options).replace(',', '');
  }

  // Start button logic
  // Updated start button handler with debug logging
  // Add this helper function first
  //let selectedTask = selectedTask || null; // ensure global exists

/*
  async function handleJobStart(staffName, jobId, task) {
  try {
    console.log("🚀 Sending POST /start-job:", { staffName, jobId, task });

    const response = await fetch(`${BASE_URL}/start-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffName,
        jobId,
        task,                              // 👈 send it
        requestTime: new Date().toISOString()
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data.code === 'ACTIVE_JOB_EXISTS') {
        const m = /job\s+([^\s]+)/i.exec(data.error || '');
        const activeJobId = m ? m[1] : '(unknown)';
        const ok = confirm(
          `${staffName} is already working on job ${activeJobId}.\n\n` +
          `Do you want to stop job ${activeJobId} and start job ${jobId} instead?`
        );
        if (!ok) return { cancelled: true };

        const stopResp = await fetch(`${BASE_URL}/stop-job`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staffName, jobId: activeJobId })
        });
        if (!stopResp.ok) throw new Error('Failed to stop current job');

        return handleJobStart(staffName, jobId, task); // retry
      }
      throw new Error(data.error || 'Failed to start job');
    }

    return { success: true, data };
  } catch (error) {
    console.error('Job start error:', error);
    return { error: error.message };
  }
}

startBtn.addEventListener('click', async (event) => {
  event.preventDefault();

  const staffName = staffSelect.value.trim();
  const jobId = jobSelect.value.trim();

  console.log("🔘 Start button clicked with:", { staffName, jobId, selectedTask });

  if (!staffName || !jobId || !selectedTask) {
    showMessage('Please select staff, job, and a task', 'error');
    return;
  }

  const result = await handleJobStart(staffName, jobId, selectedTask);

  if (result.error) {
    showMessage(result.error, 'error');
  } else if (result.cancelled) {
    showMessage('Operation cancelled', 'info');
  } else {
    showMessage('Job started successfully!', 'success');
    fetchRunningJobs();
  }
});



  function showMessage(text, type) {
    const colors = {
      error: 'red',
      success: 'black',
      info: 'blue'
    };
    messageDiv.textContent = text;
    messageDiv.style.color = colors[type] || 'black';
  }





  stopBtn.addEventListener('click', (event) => {
    event.preventDefault();
    const staffName = staffSelect.value;
    const jobId = jobSelect.value;

    if (!staffName || !jobId) {
      messageDiv.textContent = 'Please select a staff member and a job before stopping the clock.';
      return;
    }

    const stopTime = new Date();
    const formattedStopTime = formatDate(stopTime);
    const data = { staffName, jobId, stopTime: formattedStopTime };

    console.log('Sending stop-job request:', data); // Debugging log

    fetch(`${BASE_URL}/stop-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(response => response.json())
      .then(result => {
        console.log('Stop-job response:', result); // Debugging log
        if (result.message) {
          messageDiv.textContent = messageDiv.textContent = result.message || 'Job stopped successfully!';
        } else {
          messageDiv.textContent = 'No active job found for given Staff Name and job I';
        }

        fetchRunningJobs();

      })
      .catch(error => {
        console.error('Error stopping the job:', error);
        messageDiv.textContent = `Error stopping the job: ${error.message}`;
      });
  });


  viewRunningJobsBtn.addEventListener('click', (event) => {
    event.preventDefault();
    fetchRunningJobs();
    document.getElementById('pagination-controls').style.display = 'none';
  });
*/


  viewBtn.addEventListener('click', (event) => {
    console.log('View button clicked'); // Debugging log
    event.preventDefault(); // Prevent default behavior
    currentPage = 1; // Reset to the first page
    fetchRecords(); // Fetch records from the server
    document.querySelector('.filter-container').style.display = 'block';
    document.getElementById('pagination-controls').style.display = 'block';
  });



  // Updated fetchRecords with server-side filtering
  function fetchRecords() {
    showSpinner();
    const filterColumn = document.getElementById('filter-column').value;
    const filterValue = document.getElementById('filter-input').value.toLowerCase();

    const tableBody = document.querySelector('#records-table tbody');
    const messageDiv = document.getElementById('message');
    const recordsTable = document.getElementById('records-table');

    tableBody.innerHTML = '';
    recordsTable.style.display = 'none';
    messageDiv.textContent = 'Loading data...';

    fetch(`${backendBaseUrl}/view-times?page=${currentPage}&page_size=${pageSize}` +
      `&filter_column=${filterColumn}&filter_value=${encodeURIComponent(filterValue)}`, {
      method: 'GET',
      headers: {
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json"
      }
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch records');
        return response.json();
      })
      .then(data => {
        hideSpinner();
        console.log(`Data received:`, data); // Debugging log

        if (data.records && data.records.length > 0) {
          recordsTable.style.display = 'table';
          resetTableHeaders(['Staff Name', 'Job ID', 'Customer', 'Start Time', 'Stop Time', 'Worked Hours', 'Status', 'Expand']);

          populateTable(data.records);
          updatePagination(data);
          messageDiv.textContent = '';
        } else {
          messageDiv.textContent = 'No records found';
        }
      })
      .catch(error => {
        console.error('Error:', error);
        messageDiv.textContent = `Error: ${error.message}`;
      });
  }




  function navigateToCSVDataPage() {
    // Save current state if needed
    localStorage.setItem('lastPage', window.location.pathname);

    // Redirect to CSV data page
    window.location.href = 'csv_data.html';
  }






  // Helper function to populate table
  function populateTable(records) {
    const tableBody = document.querySelector('#records-table tbody');
    tableBody.innerHTML = '';

    records.forEach(record => {
      // Default row (limited columns)
      const isNearOrPastDue = isDateNearOrPassed1(record.requDate);
      // Check if the job is finished
      const isFinished = record.status === 'Finished' || record.status === 'Completed';
      const defaultRow = document.createElement('tr');
      defaultRow.className = `status-${record.status.toLowerCase()}`;

      if (isNearOrPastDue) {
        defaultRow.classList.add('date-warning'); // Add highlight class
      }
      if (isFinished) {
        defaultRow.classList.add('finished-job'); // Add green background for finished jobs
      }

      defaultRow.innerHTML = `
      <td>${record.staffName}</td>
      <td>${record.jobId}</td>
      <td>${record.customerName}</td>
      <td>${record.startTime}</td>
      <td>${record.stopTime || 'In Progress'}</td>
      <td>${record.totalHoursWorked.toFixed(2)} hrs</td>
      <td>${record.status || 'Active'}</td>
      <td>
        <button class="expand-btn">+</button>
      </td>
    `;

      // Expanded row (full details)
      const expandedRow = document.createElement('tr');
      expandedRow.classList.add('expanded-row');
      expandedRow.style.display = 'none'; // Hidden by default
      if (isDateNearOrPassed1(record.requDate)) {
        expandedRow.classList.add('due-warning'); // Add highlight class
      }

      if (isFinished) {
        expandedRow.classList.add('finished-job'); // Add green background for finished jobs
      }
      expandedRow.innerHTML = `
      <td colspan="4">
        <table class="inner-table">
          <tr>
            <th>Drawing Number</th>
            <th>No/Cell</th>
            <th>Quantity</th>
            <th>Required Date</th>
            <th>Estimated Time</th>
            <th>Remaining Time</th>
            <th>Labor Cost</th>
            <th>Modify </th>
          </tr>
          <tr>
            <td>${record.drawingNumber || 'N/A'}</td>
            <td>${record.cellNo || 'N/A'}</td>
            <td>${record.quantity || 'N/A'}</td>
            <td>${formatDateTime(record.requDate) || 'N/A'}</td>
            <td>${record.estimatedTime.toFixed(2)} hrs</td>
            <td>${record.remainingTime.toFixed(2)} hrs</td>
            <td>$${record.laborCost.toFixed(2)}</td>
                ${localStorage.getItem('userRole') === 'admin' ? `
              <td>
                  <button class="row-btn1" onclick="editTime('${record.recordId}', '${record.startTime}', '${record.stopTime}')">Edit</button>
                  <button class="row-btn2" onclick="deleteTime('${record.recordId}')">Delete</button>
              </td>
          ` : '<td></td>'}
      `;

      tableBody.appendChild(defaultRow);
      tableBody.appendChild(expandedRow);
    });
  }

  function showConfirmNoClockModal(onConfirm) {
    const modal = document.getElementById('confirmNoClockModal');
    modal.style.display = 'flex';
    document.getElementById('confirmNoClockYes').onclick = () => {
      modal.style.display = 'none';
      onConfirm();
    };
    document.getElementById('confirmNoClockNo').onclick = () => {
      modal.style.display = 'none';
    };
  }

  function doMoveJob(jobId, jobSelect) {
    fetch(`${BASE_URL}/move-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId })
    })
      .then(response => response.json())
      .then(data => {
        alert(data.message || 'Job moved successfully!');
        fetchJobs();
        if (jobSelect) jobSelect.value = '';
        window.location.reload();
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Error moving job: ' + error.message);
      });
  }


  //Move finished Jobs
  moveJobBtn.addEventListener('click', (event) => {
    event.preventDefault();
    const jobSelect = document.getElementById('job-select');
    const jobId = jobSelect.value;

    if (!jobId) {
      alert('Please select a job to move.');
      return;
    }

    // Check if there are any clockinout records for the job
    fetch(`${BASE_URL}/has-clockinout-records?jobId=${encodeURIComponent(jobId)}`)
      .then(response => response.json())
      .then(data => {
        if (!data.hasRecords) {
          showConfirmNoClockModal(() => {
            doMoveJob(jobId, jobSelect);
          });
        } else {
          doMoveJob(jobId, jobSelect);
        }
      })
      .catch(error => {
        console.error('Error checking clockinout records:', error);
        alert('Error checking job records: ' + error.message);
      });
  });


  // Toggle expand/collapse
  /*function toggleExpand(button) {
    const row = button.closest('tr');
    const expandedRow = row.nextElementSibling;
  
    if (expandedRow.style.display === 'none') {
      expandedRow.style.display = 'table-row';
      button.textContent = '-';
    } else {
      expandedRow.style.display = 'none';
      button.textContent = '+';
    }
  }
  */

  // Updated pagination controls
  function updatePagination(data) {
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    pageInfo.textContent = `Page ${data.currentPage} of ${data.totalPages}`;
    prevPageBtn.disabled = data.currentPage === 1;
    nextPageBtn.disabled = data.currentPage === data.totalPages;
  }

  // Date formatting helper
  function formatDateTime(dateString) {
    if (!dateString || dateString === 'In Progress') return dateString;

    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/,/g, '');
  }


  // Updated clear filters
  function clearFilters() {
    document.getElementById('filter-input').value = '';
    document.getElementById('filter-column').value = 'all';
    currentPage = 1;
    updateFilterPlaceholder();
    fetchRecords(); // Fetch without filters
  }

  function updateFilterPlaceholder() {
    const columnSelect = document.getElementById('filter-column');
    const filterInput = document.getElementById('filter-input');
    const selectedText = columnSelect.options[columnSelect.selectedIndex].text;
    filterInput.placeholder = `Filter by ${selectedText}...`;
    filterInput.focus();
  }

  function filterTable() {
    currentPage = 1; // Reset to first page when filtering
    fetchRecords();
  }






  // Debounce function for better performance
  function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
  }


  exportBtn.addEventListener('click', (event) => {
    event.preventDefault();
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = 'Exporting data to Excel...';

    fetch(`${BASE_URL}/export-to-excel`, {
      method: 'GET',
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to export data.');
        return response.blob(); // Fetch the response as a Blob
      })
      .then(blob => {
        // Create a URL for the Blob and trigger the download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'clock_in_data.xlsx'; // Filename for the exported file
        link.click();

        messageDiv.textContent = 'Export completed!';
      })
      .catch(error => {
        console.error('Error exporting data:', error);
        messageDiv.textContent = 'Error exporting data: ' + error.message;
      });
  });

  fetchFinishedJobs();

  updateFilterPlaceholder()

});


function fetchRunningJobs(selectedTask = null) {
  showSpinner();
  if (!BASE_URL) {
    console.error('BASE_URL is not set!');
    return;
  }

  console.log('Fetching running jobs...', selectedTask ? `task=${selectedTask}` : '(all)');
  const messageDiv = document.getElementById('message');
  const tableBody = document.querySelector('#records-table tbody');
  const recordsTable = document.getElementById('records-table');
  const viewRunningJobsBtn = document.getElementById('view-running-jobs-btn');

  if (!messageDiv || !tableBody || !recordsTable || !viewRunningJobsBtn) {
    console.error('❌ Required elements not found!');
    return;
  }

  messageDiv.textContent = 'Loading running jobs...';
  tableBody.innerHTML = '';
  recordsTable.style.display = 'none';
  viewRunningJobsBtn.disabled = true;

  const url = selectedTask
    ? `${BASE_URL}/view-running-jobs?task=${encodeURIComponent(selectedTask)}`
    : `${BASE_URL}/view-running-jobs`;

  fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch running jobs.');
      return res.json();
    })
    .then(data => {
      console.log("Running Jobs Data:", data);
      if (data.runningJobs && data.runningJobs.length > 0) {
        recordsTable.style.display = 'table';

        // Add a Task column
        resetTableHeaders(['Staff Name', 'Job ID', 'Customer', 'Drawing Number', 'Task', 'Start Time', 'Stop Button']);

        data.runningJobs.forEach(job => {
          const row = document.createElement('tr');

          const dt = new Date(job.startTime);
          const dateStr = dt.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: '2-digit' });
          const timeStr = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

          row.innerHTML = `
            <td>${job.staffName}</td>
            <td>${job.jobId}</td>
            <td>${job.customerName}</td>
            <td>${job.drawNumber}</td>
            <td>${job.task || ''}</td>
            <td>${dateStr} ${timeStr}</td>
            <td><button class="stop-btn" id="stop-btn" data-staff="${job.staffName}" data-job="${job.jobId}">Stop</button></td>
          `;
          tableBody.appendChild(row);
        });

        // Stop handlers
        document.querySelectorAll('.stop-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const staffName = e.target.dataset.staff;
            const jobId = e.target.dataset.job;
            stopRunningJob(staffName, jobId);
          });
        });

        messageDiv.textContent = '';
      } else {
        messageDiv.textContent = 'No running jobs found';
      }
    })
    .catch(err => {
      console.error('Error fetching running jobs:', err);
      messageDiv.textContent = 'Error fetching running jobs: ' + err.message;
    })
    .finally(() => {
      hideSpinner();
      viewRunningJobsBtn.disabled = false;
    });
}

let selectedTask = null;

document.addEventListener('DOMContentLoaded', () => {
  const tiles = document.querySelectorAll('#task-selection .task-tile');

  tiles.forEach(tile => {
    tile.addEventListener('click', () => {
      // Remove active from all tiles
      tiles.forEach(t => t.classList.remove('active'));

      // Add active to the clicked tile
      tile.classList.add('active');

      // Save selected task
      selectedTask = tile.dataset.task;
      console.log("✅ Task selected:", selectedTask);

      // Check if start button can be enabled
      maybeEnableStart();
    });
  });
});


function maybeEnableStart() {
  const staffVal = document.getElementById('staff-select')?.value || '';
  const jobVal = document.getElementById('job-select')?.value || '';
  const startBtn = document.getElementById('start-btn');

  startBtn.disabled = !(staffVal && jobVal && selectedTask);
}

// Hook staff/job dropdowns
document.addEventListener('change', (e) => {
  if (e.target.id === 'staff-select' || e.target.id === 'job-select') {
    maybeEnableStart();
  }
});




async function stopRunningJob(staffName, jobId) {
  try {
    const response = await fetch(`${BASE_URL}/stop-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffName, jobId })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    // Refresh the running jobs list
    fetchRunningJobs();
    showMessage1(`Job ${jobId} stopped successfully`, 'success');
  } catch (error) {
    console.error('Error stopping job:', error);
    showMessage1(`Failed to stop job: ${error.message}`, 'error');
  }
}

function showMessage1(text, type) {
  const messageDiv = document.getElementById('message');
  messageDiv.textContent = text;
  messageDiv.style.color = type === 'error' ? 'red' : 'black';
  setTimeout(() => messageDiv.textContent = '', 3000);
}


//Fetch JOBS
//let fetchJobsCalled = false; // Flag to prevent multiple calls

/*
let fetchJobsCalled = false; // Flag to prevent multiple calls

function fetchJobs() {
  if (fetchJobsCalled) {
    console.warn("⚠️ fetchJobs() already called! Skipping.");
    return;
  }

  fetchJobsCalled = true; // Mark function as called
  const jobSelect = document.getElementById('job-select');

  if (!jobSelect) {
    console.error('❌ Error: jobSelect element not found.');
    return;
  }

  console.log("🚀 Fetching jobs from backend...");

  fetch(`${BASE_URL}/get-jobs`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(response => {
      console.log("🔍 Response status:", response.status);
      return response.json();
    })
    .then(data => {
      console.log("✅ Raw jobs data:", data);

      if (!data || !data.jobs) {
        console.warn("⚠️ Response has no jobs property.");
        return;
      }

      console.log(`✅ Job count: ${data.jobs.length}`);
      jobSelect.innerHTML = '<option value="">-- Select Job --</option>';

      data.jobs.forEach((job, index) => {
        console.log(`➡️ Adding job #${index + 1}:`, job);

        const option = document.createElement('option');
        option.value = job.jobId;
        const message = getDueDateMessage(job.requiredDate);
        option.textContent = `${job.jobId} - ${job.customer} ${message}`;
        option.dataset.requiredDate = job.requiredDate;

        if (message) {
          option.classList.add('date-warning');
        }

        jobSelect.appendChild(option);
      });

      console.log("🎯 Final jobSelect options:", jobSelect.options.length);
    })
    .catch(error => {
      console.error('❌ Error fetching jobs:', error);
    });
}
*/

// Helper function to calculate due date message
function getDueDateMessage(requDate) {
  if (!requDate) return '';

  // Extract date part and parse as UTC
  const dateStr = requDate.split(' ')[0]; // Get "YYYY-MM-DD"
  const [year, month, day] = dateStr.split('-').map(Number);
  const reqDateUTC = Date.UTC(year, month - 1, day); // Months are 0-based

  // Get today's date in UTC at midnight
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);
  const todayTimeUTC = todayUTC.getTime();

  // Calculate difference in days
  const diffTime = reqDateUTC - todayTimeUTC;
  const diffDays = Math.floor(diffTime / 86400000); // 86400000 ms/day

  // Return custom message based on due date
  if (diffDays === 4) {
    return '(4 days from today)';
  } else if (diffDays === 3) {
    return '(3 days from today)';
  } else if (diffDays === 2) {
    return '(2 days from today)';
  }
  else if (diffDays === 1 || diffDays === 0) {
    return '(due today)';
  }
  else if (diffDays < 0) {
    return '(past due date)';
  } else {
    return '';
  }
}

// Helper function to format job options in Select2
function formatJobOption(option) {
  if (!option.id) return option.text;

  const $option = $(
    `<span style="${$(option.element).hasClass('date-warning') ?
      'color: red; font-weight: bold;' : ''}">${option.text}</span>`
  );
  return $option;
}








function addStaff() {
  //  input field for the new staff name
  const staffNameInput = document.getElementById('new-staff-name');
  if (!staffNameInput) {
    console.error('Error: staffNameInput element not found.');
    return;
  }

  const staffName = document.getElementById('new-staff-name').value.trim();
  if (staffName) {
    fetch(`${BASE_URL}/add-staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffName }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.message) {
          alert(data.message);

          // Clear the input field
          staffNameInput.value = '';
          closeModal('staff'); // Close the modal
          //document.getElementById('modal-staff').style.display = 'none'; //closes the modal


          const staffSelect = document.getElementById('staff-select');
          staffSelect.innerHTML = '<option value="">-- Select Staff --</option>'; // Clear dropdown
          //fetchStaff(); // Refresh staff dropdown
        } else if (data.error) {
          throw new Error(data.error);
        } else {
          throw new Error('Unexpected response from the server.');
        }
      })
      .catch(error => {
        console.error('Error adding staff:', error);
        alert('Error adding staff: ' + error.message);
      });
  } else {
    alert('Please enter a valid Staff Name.');
  }
}





// Function to open the modal and fetch data


function openModal(modalId) {
  const modal = document.getElementById(modalId + "Modal"); // Append "Modal" to ID

  if (!modal) {
    console.error(`Modal with ID ${modalId}Modal not found.`);
    return;
  }

  modal.style.display = "block"; // Show the modal

  // Fetch data for Total Labor Cost modal
  if (modalId === 'TotalLaborcost') {
    fetch(`${BASE_URL}/get-totallaborcost`)
      .then(response => response.json())
      .then(data => {
        const jobListContainer = document.getElementById('job-list-container');
        jobListContainer.innerHTML = "";

        if (data.jobs?.length > 0) {
          data.jobs.forEach(job => {
            const jobItem = document.createElement("p");
            jobItem.textContent = `Job ID: ${job.jobId} | Total Labor Cost: $${job.totalLaborCost}`;
            jobListContainer.appendChild(jobItem);
          });
        } else {
          jobListContainer.innerHTML = "<p>No job data available.</p>";
        }
      })
      .catch(error => {
        console.error("Error fetching job data:", error);
        document.getElementById('job-list-container').innerHTML = "<p>Failed to load job data.</p>";
      });
  }

  // Handle Finished Jobs modal
  if (modalId === 'finished-jobs') {
    openFinishedJobsModal();
  }
}


// Function to close the modal
function closeModal(modalId) {
  var modal = document.getElementById(modalId + "Modal");  // Close the correct modal by ID
  modal.style.display = "none";  // Hide the modal
};


let jobsData = [];  // Store the fetched job data
let finishedJobs = [];

// Fetch job data from the server and display it
function fetchJobData() {
  fetch(`${BASE_URL}/get-totallaborcost`)
    .then(response => response.json())
    .then(data => {
      jobsData = data.jobs;  // Store the fetched jobs
      displayJobs(jobsData);  // Display all jobs initially
      console.log("Jobs Data After Fetch:", jobsData);

    })
    .catch(error => {
      console.error('Error fetching job data:', error);
    });
}

// Display jobs in the modal
function displayJobs(jobs) {
  const jobListContainer = document.getElementById('job-list-container');
  jobListContainer.innerHTML = '';  // Clear previous job listings

  if (!jobs || jobs.length === 0) {
    jobListContainer.innerHTML = '<p>No jobs found</p>';
    return;
  }

  jobs.forEach(job => {
    const jobElement = document.createElement('div');
    jobElement.className = 'job-item';
    jobElement.innerHTML = `
          <strong>Job ID:</strong> ${job.jobId}, 
          <strong>Total Labor Cost:</strong> $${job.totalLaborCost || 0} 
          <button onclick="stopTask('${job.jobId}')">Stop</button>
          <button onclick="finishJob('${job.jobId}')">Finish Job</button>
      `;
    jobListContainer.appendChild(jobElement);
  });
}


// Filter and display jobs based on the search input
function searchJobs() {
  const searchInput = document.getElementById('jobSearchInput').value.toLowerCase();
  console.log("Search Input:", searchInput); // Log the user's input
  const filteredJobs = jobsData.filter(job => {
    const jobId = job.jobId ? job.jobId.toString().toLowerCase() : "";
    console.log(`Checking jobId "${jobId}" against input "${searchInput}"`); // Debug log
    return jobId.includes(searchInput); // Check if jobId includes searchInput
  });


  displayJobs(filteredJobs);  // Display filtered jobs
}



function addRunningJob(staffName, jobId) {
  const runningJobSelect = document.getElementById("running-job-select");
  const option = document.createElement("option");
  option.value = `${staffName}|${jobId}`;
  option.textContent = `${staffName} - ${jobId}`;
  runningJobSelect.appendChild(option);
}

function removeRunningJob(staffName, jobId) {
  const runningJobSelect = document.getElementById("running-job-select");
  for (const option of runningJobSelect.options) {
    if (option.value === `${staffName}|${jobId}`) {
      option.remove();
      break;
    }
  }
}

//FINISH JOB
document.addEventListener('DOMContentLoaded', () => {
  const finishBtn = document.getElementById('finish-btn');

  if (!finishBtn) {
    console.error('❌ "Finish" button not found!');
    return;
  }

  finishBtn.addEventListener('click', (event) => {
    event.preventDefault();
    const jobId = document.getElementById('job-select').value; // Only jobId is needed

    if (!jobId) {
      alert('Please select a job.');
      return;
    }

    fetch(`${BASE_URL}/finish-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }), // Send only jobId
    })
      .then(response => response.json())
      .then(data => {
        console.log(data); // Debug: Inspect the received data
        if (data.message) {
          const laborCost = (typeof data.laborCost === 'number' && !isNaN(data.laborCost))
            ? data.laborCost.toFixed(2)
            : 'N/A';
          const totalLaborCost = (typeof data.totalLaborCost === 'number' && !isNaN(data.totalLaborCost))
            ? data.totalLaborCost.toFixed(2)
            : 'N/A';
          alert(`Job finished successfully! Labor Cost: $${laborCost}, Total Labor Cost for Job: $${totalLaborCost}`);
        } else {
          alert('Failed to finish the job.');
        }
        //window.location.reload(); // Refresh the page
      })
      .catch(error => {
        console.error('Error finishing job:', error);
        alert('Error finishing job: ' + error.message);
      });
  });
});



/*
*/
function searchByCustName() {
  currentPage = 1; // Reset to page 1
  fetchFinishedJobs();
  /*const input = document.getElementById('custName').value.toLowerCase();
  const table = document.querySelector('.finished-jobs-table');
  if (!table) return;

  const rows = table.tBodies[0].rows;
  for (const row of rows) {
      const custValue = row.cells[5].textContent.toLowerCase(); // Adjust index if PN is in a different column
      row.style.display = custValue.includes(input) ? '' : 'none';
  }*/
}


function editTime(recordId, currentStart, currentStop) {
  const newStart = prompt('Enter new start time (YYYY-MM-DD HH:MM:SS):', currentStart);
  const newStop = prompt('Enter new stop time (YYYY-MM-DD HH:MM:SS):', currentStop);
  const messageDiv = document.getElementById('message');

  if (newStart && newStop) {
    fetch(`${BASE_URL}/edit-clock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': localStorage.getItem('userRole') || 'user'
      },
      body: JSON.stringify({
        recordId,
        newStartTime: newStart,
        newStopTime: newStop
      })
    })
      .then(response => response.json())
      .then(result => {
        console.log('Edit response:', result);
        messageDiv.textContent = result.message || 'Record updated successfully!';

        // Refresh running jobs if the job was still in progress
        fetchRunningJobs();
      })
      .catch(error => {
        console.error('Error editing job:', error);
        messageDiv.textContent = `Error editing job: ${error.message}`;
      });
  }
}

function deleteTime(recordId) {
  if (confirm('Are you sure you want to delete this record?')) {
    fetch(`${BASE_URL}/delete-clock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': localStorage.getItem('userRole') || 'user'
      },
      body: JSON.stringify({ recordId })
    })
      .then(response => response.json())
      .then(data => {
        alert(data.message);
        document.getElementById('view-btn').click(); // Refresh table
      });
  }
}


function loadJobWorkDetails() {
  const jobId = document.getElementById("jobIdInput").value;

  if (!jobId) {
    document.getElementById("progressContainer").innerHTML = `<p>Please enter a valid Job ID.</p>`;
    return;
  }
  // Show loading spinner
  document.getElementById("progressContainer").innerHTML = `
    <div class="loading-spinner"></div>
    <p>Loading job progress...</p>
  `;

  // Fetch job progress details
  fetch(`${backendBaseUrl}/get-job-work-details?jobId=${encodeURIComponent(jobId)}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch job details: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.error) {
        document.getElementById("progressContainer").innerHTML = `<p>${data.error}</p>`;
        return;
      }

      let totalEstimated = data.estimatedTime;
      let remaining = data.remainingTime;
      let totalWorked = data.users.reduce((sum, user) => sum + user.hours, 0);

      // HTML structure for progress bar
      let progressHtml = `
        <div class="progress-card">
          <div class="progress-header">Job Progress - ${data.jobId}</div>
          <p class="progress-info"><strong>Estimated Time:</strong> ${totalEstimated} hrs</p>
          <p class="progress-info"><strong>Status:</strong> ${data.status}</p>
          <p class="progress-info"><strong>Total Labor Cost:</strong> ${data.totalLaborCost === 'In progress' ? 'In progress' : `$${data.totalLaborCost.toFixed(2)}`}</p>
          <div class="stacked-progress-bar">
      `;

      let userLabelsHtml = `<div class="user-labels"><strong>Worked Hours:</strong><br>`;

      // Generate user progress bars & labels
      data.users.forEach(user => {
        let widthPercent = (user.hours / totalEstimated) * 100;
        let userColor = getRandomColor();
        progressHtml += `<div class="progress" style="width: ${widthPercent}%; background: ${userColor};">${user.hours}h</div>`;
        userLabelsHtml += `<div class="user-label"><span class="user-box" style="background: ${userColor};"></span>${user.name}: ${user.hours} hrs</div>`;
      });

      // Add remaining time
      let remainingWidth = (remaining / totalEstimated) * 100;
      progressHtml += `<div class="progress" style="width: ${remainingWidth}%; background: gray;">${remaining}h</div>`;
      userLabelsHtml += `<div class="user-label" style="color:red;"><span class="user-box" style="background: green;"></span>Total hours Worked: ${totalWorked} hrs</div>`;
      userLabelsHtml += `<div class="user-label"><span class="user-box" style="background: gray;"></span>Remaining: ${remaining} hrs</div>`;

      progressHtml += `</div>${userLabelsHtml}</div></div>`;
      document.getElementById("progressContainer").innerHTML = progressHtml;
    })
    .catch(error => {
      // Handle fetch errors
      document.getElementById("progressContainer").innerHTML = `<p>Error loading job progress: ${error.message}</p>`;
    });
}

// Function to generate distinct colors for users
function getRandomColor() {
  const colors = ["#FF5733", "#33FF57", "#3357FF", "#FF33A1", "#A133FF", "#FFC300"];
  return colors[Math.floor(Math.random() * colors.length)];
}



function clearFilter1() {
  document.getElementById('jobIdInput').value = '';
  document.getElementById('progressContainer').innerHTML = '';
}



//Function to display labor cost in toggle menu
function fetchFinishedJobsLaborCost() {
  showSpinner();
  fetch(`${BASE_URL}/get-finished-jobs-labor-cost`)
    .then(response => response.json())
    .then(data => {
      if (data.jobs && data.jobs.length > 0) {
        populateLaborCostTable(data.jobs);
        updateLaborCostProgressBar(data.jobs);
      } else {
        document.getElementById('laborCostTable').innerHTML = '<tr><td colspan="6">No finished jobs found.</td></tr>';
      }
    })
    .catch(error => {
      console.error('Error fetching labor costs:', error);
      document.getElementById('laborCostTable').innerHTML = `<tr><td colspan="6">Error: ${error.message}</td></tr>`;
    })
    .finally(() => hideSpinner());
}

function populateLaborCostTable(jobs) {
  const tableBody = document.querySelector('#laborCostTable tbody');
  tableBody.innerHTML = '';

  jobs.forEach(job => {
    const row = document.createElement('tr');
    row.innerHTML = `
          <td>${job.jobId}</td>
          <td>${job.customer}</td>
          <td>${job.drawingNumber}</td>
          <td>${job.quantity}</td>
          <td>$${job.totalLaborCost.toFixed(2)}</td>
          <td class="status-cell ${job.status.toLowerCase()}">${job.status}</td>
      `;
    tableBody.appendChild(row);
  });
}

function updateLaborCostProgressBar(jobs) {
  const totalLaborCost = jobs.reduce((sum, job) => sum + job.totalLaborCost, 0);
  const maxLaborCost = Math.max(...jobs.map(job => job.totalLaborCost));

  const progressBar = document.getElementById('laborCostProgress');
  progressBar.style.width = `${(totalLaborCost / maxLaborCost) * 100}%`;
  progressBar.textContent = `Total: $${totalLaborCost.toFixed(2)}`;
}




// Date overdue check highlights in orange in records table
function isDateNearOrPassed1(requDate) {
  if (!requDate) return false;
  const today = new Date();
  const reqDate = new Date(requDate);
  const diffTime = reqDate - today;
  const diffDays = Math.ceil(diffTime / (86400000)); // 86400000 ms per day
  return diffDays <= 3; // Highlight if within 3 days or past
}


// Add to existing date check functions in select job dropdown
function isDateNearOrPassed(requDate) {
  if (!requDate) return false;
  const dateOnly = requDate.split(' ')[0]; // Extracts date part only
  const reqDate = new Date(dateOnly);
  const today = new Date();

  // Sets both dates to midnight for accurate day comparison
  today.setHours(0, 0, 0, 0);
  reqDate.setHours(0, 0, 0, 0);

  const diffTime = reqDate - today;
  const diffDays = Math.ceil(diffTime / (86400000));
  return diffDays <= 7; // Highlight if within 5 days or past
}

//spinner
function showSpinner() {
  document.getElementById("spinner").style.display = "flex";
}
function hideSpinner() {
  document.getElementById("spinner").style.display = "none";
}




// Delete Job Functions
document.getElementById('openDeleteJobModal').addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    const res = await fetch(`${backendBaseUrl}/get-jobs`);
    const data = await res.json();
    const dropdown = document.getElementById('jobDropdown');
    dropdown.innerHTML = '';  // Clear previous

    data.jobs.forEach(job => {
      const option = document.createElement('option');
      option.value = job.jobId;
      option.textContent = `${job.jobId} - ${job.customer}`;
      dropdown.appendChild(option);
    });

    document.getElementById('deleteJobModal').style.display = 'block';
  } catch (err) {
    alert('Error loading job list');
  }
});


async function confirmDeleteJob() {
  const selectedJob = document.getElementById('jobDropdown').value;
  if (!selectedJob) {
    alert('Please select a job.');
    return;
  }

  if (!confirm(`Are you sure you want to delete job ${selectedJob}?`)) return;

  try {
    const res = await fetch(`${backendBaseUrl}/delete-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: selectedJob })
    });
    const result = await res.json();
    if (res.ok) {
      alert(result.message);
      closeDeleteModal('deleteJobModal');
      window.location.reload(); // Reload the page to reflect changes
    } else {
      alert('Error: ' + result.error);
    }
  } catch (err) {
    alert('Request failed: ' + err.message);
  }
}

function closeDeleteModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}


document.getElementById('openDeleteStaffModal').addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    const res = await fetch(`${backendBaseUrl}/get-staff`);
    const data = await res.json();
    const dropdown = document.getElementById('staffDropdown');
    dropdown.innerHTML = '';  // Clear previous

    data.staff.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      dropdown.appendChild(option);
    });

    document.getElementById('deleteStaffModal').style.display = 'block';
  } catch (err) {
    alert('Error loading staff list');
  }
});

function closeDeleteModal() {
  document.getElementById('deleteStaffModal').style.display = 'none';
}

async function confirmDeleteStaff() {
  const selectedStaff = document.getElementById('staffDropdown').value;
  if (!selectedStaff) {
    alert('Please select a staff member.');
    return;
  }

  if (!confirm(`Are you sure you want to delete ${selectedStaff}?`)) return;

  try {
    const res = await fetch(`${backendBaseUrl}/delete-staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffName: selectedStaff })
    });
    const result = await res.json();
    if (res.ok) {
      alert(result.message);
      loadSelectionData();
      closeDeleteModal();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (err) {
    alert('Request failed: ' + err.message);
  }
}

// Ensure dropdown closes on toggle and on item click
document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
  toggle.addEventListener('click', function (e) {
    e.preventDefault();
    const dropdown = bootstrap.Dropdown.getOrCreateInstance(this);
    dropdown.toggle();  // ensures toggle open/close
  });
});

document.querySelectorAll('.dropdown-menu .dropdown-item').forEach(item => {
  item.addEventListener('click', function () {
    const dropdownToggle = this.closest('.dropdown').querySelector('.dropdown-toggle');
    const dropdown = bootstrap.Dropdown.getInstance(dropdownToggle);
    if (dropdown) dropdown.hide();  // close on click inside
  });
});

document.querySelectorAll('.dropdown-menu.single-row .dropdown-item').forEach(item => {
  item.addEventListener('click', function () {
    const dropdownToggle = this.closest('.dropdown').querySelector('[data-bs-toggle="dropdown"]');
    if (dropdownToggle) {
      const dropdown = bootstrap.Dropdown.getInstance(dropdownToggle);
      if (dropdown) dropdown.hide();  // force close
    }
  });
});



// --- DIAGNOSTIC WIRING FOR START BUTTON ---
(function wireStartNow() {
  const ready = () => {
    const btn = document.getElementById('start-btn');
    if (!btn) { console.warn('⚠️ No #start-btn in DOM yet'); return; }

    // Ensure only one handler
    btn.replaceWith(btn.cloneNode(true));
    const freshBtn = document.getElementById('start-btn');

    freshBtn.addEventListener('click', async (ev) => {
      console.log('🔘 Start button clicked');

      // Collect selections (adjust selectors to yours)
      const staff = document.getElementById('staffSelect')?.value || '';
      const jobId = document.getElementById('jobSelect')?.value || '';
      const task  = document.querySelector('.task-tile.selected')?.dataset.task
                 || document.querySelector('#taskSelect')?.value || '';

      console.log('🧾 Collected values:', { staff, jobId, task });

      // If you had a validation gate, log it instead of silently returning
      if (!staff || !jobId || !task) {
        console.warn('⛔ Missing required field(s). Not sending POST.', { staffOK: !!staff, jobOK: !!jobId, taskOK: !!task });
        return;
      }

      const payload = { staff, jobId, task, startedAt: new Date().toISOString() };
      console.log('🚀 Sending POST /start-job with payload:', payload);

      try {
        const res = await fetch('/start-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        console.log('📥 /start-job response status:', res.status);
        const data = await res.json().catch(() => ({}));
        console.log('📦 /start-job response JSON:', data);

        if (!res.ok) {
          console.error('💥 Server rejected start:', data);
          return;
        }

        // Update UI state
        console.log('✅ Job started OK, updating UI…');
        // TODO: set running state, disable Start, enable Stop, etc.
      } catch (err) {
        console.error('💥 Network/JS error starting job:', err);
      }
    });

    console.log('🔧 Start handler wired');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }
})();
