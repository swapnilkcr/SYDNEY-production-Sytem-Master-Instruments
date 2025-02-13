



let BASE_URL = "";  // Placeholder for dynamic port

// Fetch the correct backend port from the server
fetch('http://10.0.2.161:3003/get-config')
  .then(response => response.json())
  .then(config => {
    BASE_URL = `http://10.0.2.161:${config.PORT}`;
    console.log("✅ Backend Port:", config.PORT);
    
    // Now fetch staff and jobs AFTER getting the correct PORT
    fetchStaff();
    fetchJobs();
  })
  .catch(error => {
    console.error('❌ Error fetching config:', error);
    
  });



  document.addEventListener('DOMContentLoaded', (event) => {
    event.preventDefault();
    const username = localStorage.getItem('username') || 'Unknown User';
    const userRole = localStorage.getItem('userRole') || 'Unknown Role';
  
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
  
  
  window.addEventListener('popstate', (event) => {
    event.preventDefault();
    // Redirect back to the layout page if the user presses the back button
    if (window.location.pathname === '/layout.html') {
      console.warn("⚠️ history.replaceState() is running");
      history.replaceState(null, null, window.location.href);
    }
  })
  


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


  

  /*const searchInput = document.getElementById('pn-search');
  if (searchInput) {
      searchInput.addEventListener('keyup', searchByPN);
  } else {
      console.error("Error: Search input element not found.");
  }*/
  // Stop button logic
  /*stopBtn.addEventListener('click', () => {
    const runningJobSelect = document.getElementById('running-job-select');
    const selectedValue = runningJobSelect.value;
  
    if (!selectedValue) {
      messageDiv.textContent = 'Please select a running job to stop.';
      return;
    }
  
    const [staffName, jobId] = selectedValue.split('|');
    const stopTime = new Date();
    const formattedStopTime = formatDate(stopTime);
  
    const data = {
      staffName,
      jobId,
      stopTime: formattedStopTime,
    };
  
    console.log('Stop button clicked. Sending stop-job request:', data); // Debugging log
  
    fetch(`${BASE_URL}/stop-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(response => {
        console.log('Stop-job response status:', response.status); // Debugging log
        if (!response.ok) throw new Error('Failed to stop the job.');
        return response.json();
      })
      .then(result => {
        console.log('Job stopped successfully:', result); // Debugging log
        fetchRunningJobs(); // Refresh the running jobs list
        messageDiv.textContent = result.message || 'Job stopped successfully!';
      })
      .catch(error => {
        console.error('Error stopping the job:', error);
        messageDiv.textContent = `Error stopping the job: ${error.message}`;
      });
  });*/
  
  

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
        })
        .catch(error => {
            console.error('Error stopping the job:', error);
            messageDiv.textContent = `Error stopping the job: ${error.message}`;
        });
  });
   


  // View Running Jobs Logic (view running jobs button)
  if (!viewRunningJobsBtn) {
    console.error('View Running Jobs button element not found!');
  }
  viewRunningJobsBtn.addEventListener('click', (event) => {
    event.preventDefault(); // Prevent default behavior
    if (!BASE_URL) {
      console.error('BASE_URL is not set!');
      return;
    }
    console.log('View Running Jobs button clicked');
    messageDiv.textContent = 'Loading running jobs...';  // Show loading message
    tableBody.innerHTML = '';  // Clear any existing rows
    recordsTable.style.display = 'none';  // Hide the table initially
    viewRunningJobsBtn.disabled = true;  // Disable the button during the request

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
          recordsTable.style.display = 'block';  // Show the table
          data.runningJobs.forEach(job => {
            const row = document.createElement('tr');

            // Format the start time (separate date and time)
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
            tableBody.appendChild(row);  // Append row to the table body
          });
          messageDiv.textContent = '';  // Clear the loading message
        } else {
          messageDiv.textContent = 'No running jobs found.';
        }
      })
      .catch(error => {
        console.error('Error fetching running jobs:', error);
        messageDiv.textContent = 'Error fetching running jobs: ' + error.message;
      })
      .finally(() => {
        viewRunningJobsBtn.disabled = false;  // Re-enable the button after the request is done
      });
});

  viewBtn.addEventListener('click', (event) => {
    console.log('View button clicked'); // Debugging log
    event.preventDefault(); // Prevent default behavior
    const tableBody = document.querySelector('#records-table tbody');
    const messageDiv = document.getElementById('message');
    tableBody.innerHTML = '';  // Clear any existing rows
    recordsTable.style.display = 'none';  // Hide the table initially
    messageDiv.textContent = 'Loading clock-in/clock-out data...';  // Show loading message

    fetch(`${BASE_URL}/view-times`, {
      method: 'GET',
      headers: { 
        "Accept-Encoding": "gzip",  // Tell server we accept compressed data
        "Content-Type": "application/json" },
    })
      .then(response => {
        console.log("Fetch response status:", response.status);
        if (!response.ok) throw new Error('Failed to fetch records.');
        return response.json();
      })
      .then(data => {
        if (data.records && data.records.length > 0) {
          recordsTable.style.display = 'block';  // Show the table
          data.records.forEach(record => {
            const totalHoursWorked = parseFloat(record.totalHoursWorked) || 0;
            const estimatedTime = parseFloat(record.estimatedTime) || 0;
            const remainingTime = parseFloat(record.remainingTime) !== undefined ? parseFloat(record.remainingTime).toFixed(2) : '0.00';

            // Format the start time and stop time
            const formattedStartTime = new Date(record.startTime).toLocaleString('en-GB', {
              year: 'numeric',
              month: 'long',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false, // Use 24-hour time format
            });

            const formattedStopTime = new Date(record.stopTime).toLocaleString('en-GB', {
              year: 'numeric',
              month: 'long',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false, // Use 24-hour time format
            });

            // Create table row
            const row = document.createElement('tr');
            const laborCost = (typeof record.laborCost === 'number' && !isNaN(record.laborCost))
              ? `$${record.laborCost.toFixed(2)}`
              : 'N/A';

            row.innerHTML = `
              <td>${record.staffName}</td>
              <td>${record.jobId}</td>
              <td>${record.drawingNumber}</td>
              <td>${record.cellNo}</td>
              <td>${record.quantity}</td>
              <td>${record.customerName}</td>
              <td>${formattedStartTime}</td>
              <td>${formattedStopTime}</td>
              <td>${totalHoursWorked} hrs</td>
              <td>${estimatedTime} hrs</td>
              <td>${remainingTime} hrs</td>
              <td>${laborCost}</td>
            `;
            tableBody.appendChild(row);  // Append row to the table body
          });
          messageDiv.textContent = '';  // Clear the loading message
        } else {
          messageDiv.textContent = 'No records found.';
        }
      })
      .catch(error => {
        console.error('Error fetching records:', error);
        messageDiv.textContent = `Error fetching records: ${error.message}`;
      });
  });

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

  function fetchRunningJobs() {
    console.log("Fetching running jobs..."); // Debugging Log
    fetch(`${BASE_URL}/view-running-jobs`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-cache'
    })
      .then(response => {
        console.log("Received response:", response.status); // Debugging Log
        if (!response.ok) throw new Error('Failed to fetch running jobs.');
        return response.json();
      })
      .then(data => {
        const runningJobSelect = document.getElementById('running-job-select');
        runningJobSelect.innerHTML = ''; // Clear existing options
  
        if (data.runningJobs && data.runningJobs.length > 0) {
          data.runningJobs.forEach(job => {
            const option = document.createElement('option');
            option.value = `${job.staffName}|${job.jobId}`;
            option.textContent = `${job.staffName} - ${job.jobId}`;
            runningJobSelect.appendChild(option);
          });
        } else {
          const option = document.createElement('option');
          option.value = '';
          option.textContent = 'No running jobs';
          runningJobSelect.appendChild(option);
        }
      })
      .catch(error => {
        console.error('Error fetching running jobs:', error);
      });
  }  

  
  
  
});




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
      })
      .catch(error => {
          console.error('❌ Error fetching jobs:', error);
      });
  }




  /*
  // Fixed addJob function to handle adding jobs properly
  function addJob() {
    const jobIdInput = document.getElementById('new-job-id');
    const customerInput = document.getElementById('customer');
    const stockCodeInput = document.getElementById('stock-code');
    const qtyInput = document.getElementById('quantity');
    const drawNoInput = document.getElementById('draw-no');

    if (!jobIdInput || !customerInput || !stockCodeInput || !qtyInput || !drawNoInput) {
      console.error('Error: One or more input elements not found.');
      return;
    }
    

    const jobData = {
      jobId: jobIdInput.value.trim(),
      cust: customerInput.value.trim(),
      stockCode: stockCodeInput.value.trim(),
      qty: parseInt(qtyInput.value.trim()) || 0,
      drawNo: drawNoInput.value.trim(),
      reqDate: document.getElementById('req-date').value || '',
      cellCode: document.getElementById('cell-code').value || '',
      bPrice: parseFloat(document.getElementById('b-price').value) || 0,
      orderNo: document.getElementById('order-no').value || '',
      model: document.getElementById('model').value || '',
      av: parseFloat(document.getElementById('av').value) || 0,
      salesman: document.getElementById('salesman').value || '',
    };

    fetch(`${BASE_URL}/add_job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobData),
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(errorData => {
            console.error('Error response:', errorData);
            throw new Error(errorData.error || 'Failed to add job.');
          });
        }
        return response.json();
      })
      .then(data => {
        alert(data.message);
        jobIdInput.value = '';
        customerInput.value = '';
        stockCodeInput.value = '';
        qtyInput.value = '';
        drawNoInput.value = '';
        document.getElementById('modal-job').style.display = 'none';

        setTimeout(() => {
          fetchJobs(); // Refresh job list
        },1000);
      })
      .catch(error => {
        console.error('Error adding job:', error);
        alert(`Error adding job: ${error.message}`);
      });
  } */



//Function to fetch staff and add staff
// Fetch staff and populate the dropdown


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
    fetch('http://10.0.2.161:3003/get-totallaborcost')
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
    fetch('http://10.0.2.161:8080/get-totallaborcost')
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

//LAYERING FOR DIFFERENT USERS.

/*function logout() {
  localStorage.clear(); // Clear stored user data
  window.location.href = "http://10.0.2.161:3004/Login.html"; // Redirect to login page
}*/


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
  const staffName = document.getElementById('staff-select').value;
  const jobId = document.getElementById('job-select').value;

  if (!staffName || !jobId) {
      alert('Please select a staff member and a job.');
      return;
  }

  fetch(`${BASE_URL}/finish-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffName, jobId }),
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
    })
    
      .catch(error => {
          console.error('Error finishing job:', error);
          alert('Error finishing job: ' + error.message);
      });
});
});




function fetchFinishedJobs() {
  fetch('http://10.0.2.161:3003/view-finished-jobs')
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
});

function searchByPN() {
    const input = document.getElementById('pn-search').value.toLowerCase();
    const table = document.querySelector('.finished-jobs-table');
    if (!table) return;

    const rows = table.tBodies[0].rows;
    for (const row of rows) {
        const pnValue = row.cells[1].textContent.toLowerCase(); // Adjust index if PN is in a different column
        row.style.display = pnValue.includes(input) ? '' : 'none';
    }
}































  
