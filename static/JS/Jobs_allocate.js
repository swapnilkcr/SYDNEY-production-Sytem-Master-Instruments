const BACKEND_IP = "10.0.0.80";


// When "Backorder" button is clicked, toggle backorder for selected jobs (in DB)
async function toggleBackorder() {
    const selectedJobs = Array.from(document.querySelectorAll('.job-card.selected'));
    if (selectedJobs.length === 0) {
        alert('Please select at least one job to backorder/remove from backorder.');
        return;
    }
    // Determine if all selected jobs are already backordered by checking class
    const allBackordered = selectedJobs.every(card => card.classList.contains('backorder'));
    const jobIds = selectedJobs.map(card => card.dataset.id);

    try {
        const res = await fetch(`${BASE_URL}/set-backorder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jobIds: jobIds,
                backorder: !allBackordered
            })
        });
        const result = await res.json();
        if (result.success) {
            loadSelectionData(); // reloads jobs and their backorder state
        } else {
            alert(result.error || 'Failed to update backorder status');
        }
    } catch (err) {
        alert('Request failed: ' + err.message);
    }
}

// Load jobs and staff on page load
async function loadSelectionData() {
    try {
        const [jobsRes, staffRes] = await Promise.all([
            fetch(`${BASE_URL}/get-jobs`),
            fetch(`${BASE_URL}/get-staff`)
        ]);

        const jobs = await jobsRes.json();
        const staff = await staffRes.json();

        populateCards('jobs-grid', jobs.jobs, 'job');
        populateCards('staff-grid', staff.staff, 'staff');
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Highlight jobs in backorder state from backend property
function populateCards(containerId, items, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = (items || []).map(item => {
        if (type === 'job') {
            const isAssigned = item.isAssigned ? 'assigned' : '';
            const backorderClass =
                (item.backorder === true || item.backorder === 1 || item.backorder === "1")
                    ? 'backorder' : '';

            return `
                <div class="job-card ${isAssigned} ${backorderClass}" data-id="${item.jobId}">
                    <strong>${item.jobId}</strong><br>
                    <span>${item.customer || ''}</span>
                </div>
            `;
        } else {
            // Staff case — handle string OR object
            const staffName = typeof item === 'string' ? item : (item.name || item.staffName || JSON.stringify(item));
            return `
                <div class="staff-card" data-id="${staffName}">
                    ${staffName}
                </div>
            `;
        }
    }).join('');

    // Add click handlers
    container.querySelectorAll(`.${type}-card`).forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('selected');
        });
    });
}

// Add job search functionality
const jobSearchInput = document.getElementById('jobSearchInput');
if (jobSearchInput) {
    jobSearchInput.addEventListener('input', function () {
        const query = this.value.toLowerCase();
        document.querySelectorAll('#jobs-grid .job-card').forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(query) ? '' : 'none';
        });
    });
}

// Handle assignment
async function assignSelected() {
    const selectedJobs = Array.from(document.querySelectorAll('.job-card.selected'))
        .map(card => card.dataset.id);

    const selectedStaff = Array.from(document.querySelectorAll('.staff-card.selected'))
        .map(card => card.textContent.trim());

    if (selectedJobs.length === 0 || selectedStaff.length === 0) {
        alert('Please select at least one job and one staff member');
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/allocate-jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jobIds: selectedJobs,
                staffNames: selectedStaff
            })
        });

        if (response.ok) {
            alert('Successfully assigned jobs!');
            // Highlight assigned job cards
            selectedJobs.forEach(jobId => {
                const card = document.querySelector(`.job-card[data-id="${jobId}"]`);
                if (card) {
                    card.classList.add('assigned');
                }
            });
            // Clear selection
            document.querySelectorAll('.selected').forEach(card =>
                card.classList.remove('selected'));
        } else {
            throw new Error('Assignment failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error assigning jobs');
    }
}

// Call this on page load
document.addEventListener('DOMContentLoaded', loadSelectionData);

/* --------------------
   OPTIONAL MODAL BLOCK
   -------------------- */
document.addEventListener('DOMContentLoaded', () => {
    const staffCardsContainer = document.getElementById('staff-cards-container');
    const jobModal = document.getElementById('jobModal');
    const closeBtn = document.querySelector('.modal .close');

    // Only run if these elements exist
    if (!staffCardsContainer || !jobModal || !closeBtn) return;

    fetch(`${BASE_URL}/get-staff`)
        .then(response => response.json())
        .then(data => {
            if (Array.isArray(data.staff)) {
                staffCardsContainer.innerHTML = '';
                data.staff.forEach(staff => {
                    // Try to get the staff name from common properties
                    const staffName = staff.name || staff.staffName || staff.staff || (typeof staff === 'string' ? staff : JSON.stringify(staff));
                    const staffCard = document.createElement('div');
                    staffCard.className = 'staff-card';
                    staffCard.innerHTML = `
                        <h3>${staffName}</h3>
                        <p>Click to view allocated jobs</p>
                    `;
                    staffCard.addEventListener('click', () => {
                        fetch(`${BASE_URL}/get-allocated-jobs?staffName=${encodeURIComponent(staffName)}`)
                            .then(response => response.json())
                            .then(data => {
                                const tbody = document.querySelector('#jobsTable tbody');
                                tbody.innerHTML = '';
                                if (Array.isArray(data.jobs) && data.jobs.length > 0) {
                                    data.jobs.forEach(job => {
                                        const row = document.createElement('tr');
                                        row.innerHTML = `
                                            <td>${job.jobId}</td>
                                            <td>${job.customerName}</td>
                                            <td>${job.allocationDate?.split(' ')[0] || 'N/A'}</td>
                                        `;
                                        tbody.appendChild(row);
                                    });
                                } else {
                                    const row = document.createElement('tr');
                                    row.innerHTML = `<td colspan="3">No jobs allocated to this staff member.</td>`;
                                    tbody.appendChild(row);
                                }
                                jobModal.style.display = 'block';
                            })
                            .catch(error => {
                                console.error('Error fetching allocated jobs:', error);
                                alert('Failed to load allocated jobs.');
                            });
                    });
                    staffCardsContainer.appendChild(staffCard);
                });
            } else {
                console.error('Unexpected response format:', data);
                alert('Error: Unexpected response format from the server.');
            }
        })
        .catch(error => console.error('Error fetching staff:', error));

    // Close modal handlers
    closeBtn.onclick = () => { jobModal.style.display = 'none'; };
    window.onclick = (event) => {
        if (event.target === jobModal) {
            jobModal.style.display = 'none';
        }
    };
});
