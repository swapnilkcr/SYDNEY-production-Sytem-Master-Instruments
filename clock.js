



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
        env = window.location.port === "3004" ? "test" : "prod";
    }
}

// Set backend based on environment
const BACKEND_IP = "10.0.2.161";
const backendBaseUrl = env === "test" 
  ? `http://${BACKEND_IP}:3003`  // Test backend
  : `http://${BACKEND_IP}:3000`; // Prod backend

console.log(`🔄 Detected Environment: ${env}`);
console.log(`🔗 Backend Base URL: ${backendBaseUrl}`);

fetch(`${backendBaseUrl}/get-config`)
  .then(response => response.json())
  .then(config => {
    BASE_URL = config.base_url || backendBaseUrl;
    console.log("✅ Backend URL:", BASE_URL);
    fetchStaff();
    fetchJobs();
  })
  .catch(error => {
    console.error('❌ Error fetching config:', error);
    BASE_URL = backendBaseUrl; // Fallback
    fetchStaff();
    fetchJobs();
  });

  let currentPage = 1;
  let lastSeenId = 0; // Stores the last record ID seen



document.addEventListener('DOMContentLoaded', (event) => {
    event.preventDefault();
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
    
    let currentPage = 1;
    const pageSize = 5;
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
    document.getElementById('clear-filter1').addEventListener('click', clearFilter1);
    
  
  
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
  startBtn.addEventListener('click', (event) => {
    event.preventDefault();
    const staffName = staffSelect.value;
    const jobId = jobSelect.value;

    if (!staffName || !jobId) {
      messageDiv.textContent = 'Please select a staff member and a job before starting the clock.';
      return;
    }

    const sessionKey = `${staffName}|${jobId}`;
    if (activeSessions[sessionKey]) {
      messageDiv.textContent = `${staffName} is already working on ${jobId}.`;
      return;
    }

    const startTime = new Date();
    const formattedStartTime = formatDate(startTime);

    stopBtn.disabled = false;
    messageDiv.textContent = `Clock started for ${staffName} on ${jobId} at: ${formattedStartTime}`;
    activeSessions[sessionKey] = { startTime, formattedStartTime };

    // Send start session to the backend
    fetch(`${BASE_URL}/start-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffName, jobId, startTime: formattedStartTime }),
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to start the job.');
        return response.json();
      })
      .then(result => {
        console.log('Job started successfully:', result);
        messageDiv.textContent = result.message || 'Job started successfully!';
      })
      .catch(error => {
        console.error('Error starting the job:', error);
        messageDiv.textContent = `Error starting the job: ${error.message}`;
      });

    console.log('Active sessions after start:', activeSessions);
  });


  
  

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
                messageDiv.textContent = result.message;
            } else {
                messageDiv.textContent = 'No active job found for given Staff Name and job I';
            }
            window.location.reload();
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
      console.log(`Data received:`, data); // Debugging log

        if (data.records && data.records.length > 0) {
            recordsTable.style.display = 'table';
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





// Helper function to populate table
function populateTable(records) {
  const tableBody = document.querySelector('#records-table tbody');
  tableBody.innerHTML = '';
  
  records.forEach(record => {
      const row = document.createElement('tr');


      // Add highlight class if needed
      if (isDateNearOrPassed(record.requDate)) {
        row.classList.add('highlight-row');
      }
      
      // Add class based on status
      if (record.status === 'Finished') {
          row.classList.add('finished-job');
      }
      
      const laborCost = typeof record.laborCost === 'number' ? 
          `$${record.laborCost.toFixed(2)}` : 'N/A';

      row.innerHTML = `
          <td>${record.staffName}</td>
          <td>${record.jobId}</td>
          <td>${record.drawingNumber}</td>
          <td>${record.cellNo}</td>
          <td>${record.quantity}</td>
          <td>${record.customerName}</td>
          <td>${formatDateTime(record.requDate)}</td>
          <td>${formatDateTime(record.startTime)}</td>
          <td>${formatDateTime(record.stopTime)}</td>
          <td>${record.totalHoursWorked.toFixed(2)} hrs</td>
          <td>${record.estimatedTime.toFixed(2)} hrs</td>
          <td>${record.remainingTime.toFixed(2)} hrs</td>
          <td>${laborCost}</td>
          <td class="status-cell">${record.status || 'Active'}</td>
      
          ${localStorage.getItem('userRole') === 'admin' ? `
              <td>
                  <button class="row-btn1" onclick="editTime('${record.recordId}', '${record.startTime}', '${record.stopTime}')">Edit</button>
                  <button class="row-btn2" onclick="deleteTime('${record.recordId}')">Delete</button>
              </td>
          ` : '<td></td>'}
      `;
      tableBody.appendChild(row);
  });
}


//Move finished Jobs
const moveJobBtn = document.getElementById('moveJobButton');
  if (moveJobBtn) {
    moveJobBtn.addEventListener('click', (event) => {
      event.preventDefault();
      const jobSelect = document.getElementById('job-select');
      const jobId = jobSelect.value;

      if (!jobId) {
        alert('Please select a job to move.');
        return;
      }

      fetch(`${BASE_URL}/move-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      })
      .then(response => response.json())
      .then(data => {
        alert(data.message || 'Job moved successfully!');
        // Refresh job list
        fetchJobs();
        // Clear selection
        jobSelect.value = '';
        window.location.reload();
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Error moving job: ' + error.message);
      });
    });
  }


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

  
      updateFilterPlaceholder()
  
});


function fetchRunningJobs() {
  if (!BASE_URL) {
    console.error('BASE_URL is not set!');
    return;
  }

  console.log('Fetching running jobs...');
  const messageDiv = document.getElementById('message');
  const tableBody = document.querySelector('#records-table tbody');
  const recordsTable = document.getElementById('records-table');
  const viewRunningJobsBtn = document.getElementById('view-running-jobs-btn');

  if (!messageDiv || !tableBody || !recordsTable || !viewRunningJobsBtn) {
    console.error('❌ Required elements not found!');
    return;
  }

  messageDiv.textContent = 'Loading running jobs...';
  tableBody.innerHTML = '';  // Clear previous entries
  recordsTable.style.display = 'none';  
  viewRunningJobsBtn.disabled = true;  

  fetch(`${BASE_URL}/view-running-jobs`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(response => {
      if (!response.ok) throw new Error('Failed to fetch running jobs.');
      return response.json();
    })
    .then(data => {
      console.log("Running Jobs Data:", data);
      if (data.runningJobs && data.runningJobs.length > 0) {
        recordsTable.style.display = 'block';  
        data.runningJobs.forEach(job => {
          const row = document.createElement('tr');

          const formattedDate = new Date(job.startTime).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: '2-digit',
          });

          const formattedTime = new Date(job.startTime).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          });

          row.innerHTML = `
            <td>${job.staffName}</td>
            <td>${job.jobId}</td>
            <td>${formattedDate} ${formattedTime}</td>
          `;
          tableBody.appendChild(row);
        });
        messageDiv.textContent = '';  
      } else {
        messageDiv.textContent = 'No running jobs found.';
      }
    })
    .catch(error => {
      console.error('Error fetching running jobs:', error);
      messageDiv.textContent = 'Error fetching running jobs: ' + error.message;
    })
    .finally(() => {
      viewRunningJobsBtn.disabled = false;
    });
}

  let fetchJobsCalled = false;
  let cachedJobs = null; // Store fetched jobs
  function fetchJobs() {
    console.log("🔍 fetchJobs() called at:", new Date().toISOString());  // Track every call

    if (fetchJobsCalled) {

          console.warn("⚠️ fetchJobs() already called! Skipping.");
          return;
    }
      fetchJobsCalled = true; // Mark function as called

      console.log("🔍 fetchJobs() called");

      const jobSelect = document.getElementById('job-select');
      if (!jobSelect) {
          console.error('❌ Error: jobSelect element not found.');
          return;
      }

      console.log("✅ Found jobSelect element.");
      console.log("🚀 Fetching jobs from backend...");


      fetch(`${BASE_URL}/get-jobs`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      .then(response => {
          console.log("🔄 Fetch response status:", response.status);

          if (response.redirected) {
              console.warn("⚠️ Redirect detected! This may be causing a loop.");
              return;
          }

          return response.json();
      })
      .then(data => {
          console.log("✅ Fetch response received:", data);

          if (!data || !data.jobs || data.jobs.length === 0) {
              console.warn('⚠️ No job data available.');
              return;
          }

          jobSelect.innerHTML = '<option value="">-- Select Job --</option>'; // Clear existing options

          data.jobs.forEach(job => {
              console.log(`📌 Adding job: ${job.jobId}`);
              const option = document.createElement('option');
              option.value = job.jobId;
              option.textContent = `${job.jobId} - ${job.customer}`;
              jobSelect.appendChild(option);
          });

          console.log("✅ Job dropdown updated.");
          $(jobSelect).select2({
            placeholder: "Search for a job ID",
            allowClear: true,
            minimumInputLength: 0
          });
        })
      
      .catch(error => {
          console.error('❌ Error fetching jobs:', error);
      });
  }



let isFetching = false;
function fetchStaff() {
  console.log('fetching')
  const staffSelect = document.getElementById('staff-select');
  if (!staffSelect) {
    console.error('Error: staffSelect element not found.');
    return;
  }

  if (isFetching) return;
  isFetching = true;
  fetch(`${BASE_URL}/get-staff`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(response => response.json())
    .then(data => {
      if (data.staff && data.staff.length > 0) {
        staffSelect.innerHTML = '<option value="">-- Select Staff --</option>'; // Clear existing options
        data.staff.forEach(staff => {
          const option = document.createElement('option');
          option.value = staff;
          option.textContent = staff;
          staffSelect.appendChild(option);
        });
      } else {
        console.warn('No staff data available.');
      }
    })
    .catch(error => {
      console.error('Error fetching staff:', error);
    })
    .finally(() => {
      isFetching = false;  // Reset flag even if there's an error
    });
    
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
          document.getElementById('modal-staff').style.display = 'none'; //closes the modal

        
          const staffSelect = document.getElementById('staff-select');
          staffSelect.innerHTML = '<option value="">-- Select Staff --</option>'; // Clear dropdown
          fetchStaff(); // Refresh staff dropdown
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
        window.location.reload(); // Refresh the page
      })
      .catch(error => {
        console.error('Error finishing job:', error);
        alert('Error finishing job: ' + error.message);
      });
    });
  });




function fetchFinishedJobs() {
  fetch(`${backendBaseUrl}/view-finished-jobs`)
    .then(response => response.json())
    .then(data => {
      console.log('Finished Jobs Data:', data);
      const container = document.getElementById('finished-jobs-container');
      container.innerHTML = '';

      if (data.jobs && data.jobs.length > 0) {
        const table = document.createElement('table');
        table.className = 'finished-jobs-table';
        table.innerHTML = `
          <thead>
            <tr>
              ${Object.keys(data.jobs[0]).map(col => `<th>${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.jobs.map(job => `
              <tr>
                ${Object.values(job).map(value => `<td>${value}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        `;
        container.appendChild(table);
      } else {
        container.innerHTML = '<p>No finished jobs found.</p>';
      }
    })
    .catch(error => {
      console.error('Error fetching finished jobs:', error);
      document.getElementById('finished-jobs-container').innerHTML = '<p>Error loading finished jobs.</p>';
    });
}
document.addEventListener('DOMContentLoaded', () => {
  fetchFinishedJobs();
})

function searchByCustName() {
    const input = document.getElementById('custName').value.toLowerCase();
    const table = document.querySelector('.finished-jobs-table');
    if (!table) return;

    const rows = table.tBodies[0].rows;
    for (const row of rows) {
        const custValue = row.cells[5].textContent.toLowerCase(); // Adjust index if PN is in a different column
        row.style.display = custValue.includes(input) ? '' : 'none';
    }
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
  document.getElementById('progressContainer').innerHTML='';
}



//Function to display labor cost in toggle menu
function fetchFinishedJobsLaborCost() {
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
      });
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




// Date overdue check
function isDateNearOrPassed(requDate) {
  if (!requDate) return false;
  const today = new Date();
  const reqDate = new Date(requDate);
  const diffTime = reqDate - today;
  const diffDays = Math.ceil(diffTime / (86400000)); // 86400000 ms per day
  return diffDays <= 3; // Highlight if within 3 days or past
}












  
