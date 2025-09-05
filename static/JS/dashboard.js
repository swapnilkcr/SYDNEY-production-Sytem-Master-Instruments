    const BACKEND_IP = "10.0.0.80";
    
    
    let timeChartInstance = null;
    let barChartInstance = null;

    async function loadJobData(jobId) {
      if (!jobId) return;
      try {
        const res = await fetch(`${BASE_URL}/get-full-job-data?jobId=${jobId}`);
        const data = await res.json();

        const pn = data.pnData || {};
        const work = data.workData || {};

        document.getElementById('jobId').textContent = pn.pn || jobId;
        document.getElementById('customer').textContent = pn.cust || 'N/A';
        document.getElementById('drawingNo').textContent = pn.drawNo || 'N/A';
        document.getElementById('stockCode').textContent = pn.stockCode || 'N/A';
        document.getElementById('qty').textContent = pn.qty || 'N/A';
        document.getElementById('salesman').textContent = pn.salesman || 'N/A';
        document.getElementById('orderDate').textContent = pn.orderDate || 'N/A';

        const status = work.status || "Unknown";
        const statusBadge = document.getElementById('statusBadge');
        statusBadge.textContent = status;
        statusBadge.className = "badge";
        if (status === "Completed") {
          statusBadge.classList.add("bg-success");
        } else if (status === "In Progress") {
          statusBadge.classList.add("bg-warning", "text-dark");
        } else {
          statusBadge.classList.add("bg-danger");
        }

        const bPrice = parseFloat(pn["b$"] || 0);
        const sPrice = parseFloat(pn["s$"] || 0);
        const qty = parseFloat(pn.qty || 0);
        const laborCost = parseFloat(work.totalLaborCost || 0);
        const profit = (sPrice * qty) - laborCost - (bPrice * qty);

        document.getElementById('bPrice').textContent = bPrice.toFixed(2);
        document.getElementById('sPrice').textContent = sPrice.toFixed(2);
        document.getElementById('laborCost').textContent = laborCost.toFixed(2);
        document.getElementById('profit').textContent = profit.toFixed(2);

        const estimated = parseFloat(work.estimatedTime || 0);
        const worked = parseFloat(work.totalHoursWorked || 0);
        const remaining = parseFloat(work.remainingTime || 0);
        let percent = estimated > 0 ? Math.min((worked / estimated) * 100, 100) : 0;


        document.getElementById('estimatedTime').textContent = estimated;
        document.getElementById('totalHours').textContent = worked.toFixed(2);
        document.getElementById('remainingTime').textContent = remaining;
        const progressBar = document.getElementById('progressBar');
        progressBar.style.width = `${percent}%`;
        progressBar.textContent = `${percent.toFixed(0)}%`;

        const empList = document.getElementById('employeeHours');
        empList.innerHTML = '';
        const users = work.users || [];
        console.log("📊 Users data:", users);

        users.forEach(user => {
          if (user.hours > 0) {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `<span><i class="bi bi-person-fill"></i> ${user.name}</span><span class="badge bg-primary">${user.hours.toFixed(2)} h</span>`;
            empList.appendChild(li);
          }
        });

        if (timeChartInstance) timeChartInstance.destroy();
        timeChartInstance = new Chart(document.getElementById('timeChart'), {
          type: 'doughnut',
          data: {
            labels: ['Worked', 'Remaining'],
            datasets: [{ data: [worked, remaining], backgroundColor: ['#198754', '#dee2e6'] }]
          },
          options: { plugins: { legend: { position: 'bottom' } } }
        });

        if (barChartInstance) barChartInstance.destroy();
        const barCtx = document.getElementById("barChart").getContext("2d");
        const maxHour = Math.max(...users.map(u => u.hours), 10);
        barChartInstance = new Chart(barCtx, {
          type: 'bar',
          data: {
            labels: users.map(u => u.name),
            datasets: [{
              label: 'Hours Worked',
              data: users.map(u => u.hours),
              backgroundColor: '#0d6efd'
            }]
          },
          options: {
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
              x: {
                title: { display: true, text: 'Hours' },
                beginAtZero: true,
                suggestedMax: maxHour + 10
              },
              y: { title: { display: true, text: 'Employee' } }
            }
          }
        });


        const clockLogsBody = document.getElementById("clockLogsBody");
        clockLogsBody.innerHTML = "";
        console.log("🧪 Clock Logs Received:", data.logData);

        (data.logData || []).forEach(log => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${log.staffName}</td>
            <td>${log.task || "N/A"}</td>
            <td>${log.startTime}</td>
            <td>${log.stopTime}</td>
            <td>${log.hours}</td>
          `;
          clockLogsBody.appendChild(tr);
        });
      } catch (err) {
        console.error('Error fetching job data:', err);
        alert('Failed to load job data');
      }
    }

    function searchJob() {
      const input = document.getElementById('jobSearch').value.trim();
      const jobId = input.match(/^[^\s-]+/)[0];
      if (!jobId) {
        alert('Please enter a Job ID.');
        return;
      }
      loadJobData(jobId);
    }


    async function loadJobSuggestions() {
      try {
        const res = await fetch(`${BASE_URL}/get-all-job-ids`);
        const data = await res.json();
        const datalist = document.getElementById("jobSuggestions");
        datalist.innerHTML = "";

        (data.suggestions || []).forEach(item => {
          const option = document.createElement("option");
          option.value = item.label; // shows "JOBID - Customer Name"
          datalist.appendChild(option);
        });
      } catch (err) {
        console.error("Failed to load job suggestions:", err);
      }
    }



    const jobId = document.getElementById("jobSearch").value.trim();
    console.log("Searching for jobId:", jobId);
    loadJobData(jobId);


    loadJobSuggestions();
    function updateJobStatusSummary() {
      fetch(`${BASE_URL}/get-job-status-summary`)
        .then(res => res.json())
        .then(data => {
          document.getElementById('total-jobs').textContent = data.total;
          document.getElementById('in-progress').textContent = data.inProgress;
          document.getElementById('completed').textContent = data.completed;
          document.getElementById('not-started').textContent = data.notStarted;
        })
        .catch(err => {
          console.error('Failed to fetch job status summary:', err);
        });
    }

    // Call on load
    document.addEventListener('DOMContentLoaded', updateJobStatusSummary);

    function fetchNotStartedJobs() {
      const modalEl = document.getElementById('notStartedModal');

      // Ensure Bootstrap resets aria-hidden and sets focus properly
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

      fetch(`${BASE_URL}/get-not-started-jobs`)
        .then(res => res.json())
        .then(data => {
          const list = document.getElementById('not-started-list');
          list.innerHTML = '';

          if (data.jobs && data.jobs.length > 0) {
            data.jobs.forEach(job => {
              const li = document.createElement('li');
              li.className = 'list-group-item d-flex justify-content-between align-items-center';
              li.innerHTML = `
            <span><i class="bi bi-briefcase-fill text-danger me-2"></i> Job ID: ${job.jobId}</span>
            <span class="badge bg-secondary">${job.customer}</span>
          `;
              list.appendChild(li);
            });
          } else {
            list.innerHTML = '<li class="list-group-item">No not started jobs found.</li>';
          }

          modal.show(); // ✅ Let Bootstrap handle accessibility and focus
        })
        .catch(err => {
          alert('Error fetching not started jobs: ' + err.message);
        });
    }

    


