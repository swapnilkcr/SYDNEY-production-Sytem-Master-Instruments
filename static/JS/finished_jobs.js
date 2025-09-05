// finished_jobs.js

// Pagination state (renamed to avoid clashing with main.js)
let finishedJobsPage = 1;
const finishedJobsPageSize = 10;
let finishedJobsTotalPages = 1;

// Wait for BASE_URL from main.js
document.addEventListener("DOMContentLoaded", () => {
  if (typeof BASE_URL !== "undefined") {
    fetchFinishedJobs();
  } else {
    console.warn("⚠️ BASE_URL not ready, waiting for main.js...");
    const checkInterval = setInterval(() => {
      if (typeof BASE_URL !== "undefined") {
        clearInterval(checkInterval);
        fetchFinishedJobs();
      }
    }, 200);
  }
});

function fetchFinishedJobs() {
  const searchTerm = document.getElementById("custName")?.value.trim() || "";
  const url = `${BASE_URL}/view-finished-jobs?page=${finishedJobsPage}&page_size=${finishedJobsPageSize}`;
    + (searchTerm ? `&custName=${encodeURIComponent(searchTerm)}` : '');

  console.log("🌍 Fetching:", url);

  fetch(url)
    .then(response => response.json())
    .then(data => {
      console.log('Finished Jobs Data:', data);
      renderTable(data);
      updatePaginationControls(data);
    })
    .catch(error => {
      console.error('Error:', error);
      document.getElementById('finished-jobs-container').innerHTML =
        '<p>Error loading finished jobs.</p>';
    });
}

function renderTable(data) {
  const container = document.getElementById('finished-jobs-container');
  container.innerHTML = '';

  if (data.jobs && data.jobs.length > 0) {
    const table = document.createElement('table');
    table.className = 'finished-jobs-table';

    // Table headers
    const thead = document.createElement('thead');
    let columns = Object.keys(data.jobs[0]);
    console.log("👉 Columns detected:", Object.keys(data.jobs[0]));
    console.log("👉 First row data:", data.jobs[0]);

    // Remove "EXCLUDE_SAVE_TIME" from visible columns
    columns = columns.filter(col => col !== "EXCLUDE_SAVE_TIME");

    // Move "PRODUCTION READY DATE" next to "INPUT DATE"
    const inputIndex = columns.indexOf("INPUT DATE");
    const readyIndex = columns.indexOf("PRODUCTION READY DATE");
    if (inputIndex !== -1 && readyIndex !== -1 && readyIndex !== inputIndex + 1) {
      const [readyCol] = columns.splice(readyIndex, 1);
      columns.splice(inputIndex + 1, 0, readyCol);
    }

    thead.innerHTML = `<tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>`;
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement('tbody');
    data.jobs.forEach(job => {
      const row = document.createElement('tr');
      row.innerHTML = columns.map(col => {
        const value = job[col];
        return `<td>${(value === null || value === 'null') ? '' : value}</td>`;
      }).join('');
      tbody.appendChild(row);
    });
    table.appendChild(tbody);

    container.appendChild(table);
  } else {
    container.innerHTML = '<p>No finished jobs found.</p>';
  }
}

function updatePaginationControls(data) {
  finishedJobsTotalPages = data.total_pages || 1;
  const pageNumberEl = document.getElementById('pageNumber');
  if (pageNumberEl) {
    pageNumberEl.textContent = `Page ${finishedJobsPage} of ${finishedJobsTotalPages}`;
  }

  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  if (prevBtn) prevBtn.disabled = finishedJobsPage === 1;
  if (nextBtn) nextBtn.disabled = finishedJobsPage >= finishedJobsTotalPages;
}

// Pagination helpers
function nextFinishedPage() {
  if (finishedJobsPage < finishedJobsTotalPages) {
    finishedJobsPage++;
    fetchFinishedJobs();
  }
}
function prevFinishedPage() {
  if (finishedJobsPage > 1) {
    finishedJobsPage--;
    fetchFinishedJobs();
  }
}
function searchByCustName() {
  finishedJobsPage = 1;
  fetchFinishedJobs();
}

// Export to Excel
function exportToExcel() {
  if (!window.XLSX) {
    alert("Export library (XLSX) not found on this page.");
    return;
  }
  const searchTerm = document.getElementById("custName")?.value.trim() || "";
  const url = `${BASE_URL}/view-finished-jobs?page=1&page_size=10000`
    + (searchTerm ? `&custName=${encodeURIComponent(searchTerm)}` : '');

  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.jobs && data.jobs.length > 0) {
        const columnsToInclude = [
          'INPUT DATE', 'PRODUCTION READY DATE', 'PN', 'DRAW NO', 'REQU-DATE', 'CUST',
          'STOCK CODE', 'QTY', 'B$', 'STAFF', 'END DATE', 'AV', 'SALESMAN',
          'Order Date', 'EstimatedTime', 'TotalHoursWorked'
        ];

        const filteredData = data.jobs.map(job => {
          const filteredJob = {};
          columnsToInclude.forEach(col => {
            filteredJob[col] = (job[col] === null || job[col] === 'null') ? '' : job[col];
          });
          return filteredJob;
        });

        const ws = XLSX.utils.json_to_sheet(filteredData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "FinishedJobs");
        XLSX.writeFile(wb, "FinishedJobs.xlsx");
      } else {
        alert("No data to export");
      }
    })
    .catch(error => {
      console.error('Export error:', error);
      alert("Error exporting data");
    });
}

// Expose functions globally (for inline HTML)
window.nextFinishedPage = nextFinishedPage;
window.prevFinishedPage = prevFinishedPage;
window.searchByCustName = searchByCustName;
window.exportToExcel = exportToExcel;
