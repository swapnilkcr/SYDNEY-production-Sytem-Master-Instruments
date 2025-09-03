let selectedTask = null;

// ----------------------
// Validate selections
// ----------------------
function validateSelections() {
	const staff = document.getElementById('staff-select')?.value?.trim();
	const job = document.getElementById('job-select')?.value?.trim();
	const startBtn = document.getElementById('start-btn');

	console.log("🔎 Validating selections:", { staff, job, selectedTask });
	startBtn.disabled = !(staff && job && selectedTask);
}

// ----------------------
// Task tile click (ALL in one place)
// ----------------------
function handleTaskClick(tile) {
	// Remove active class from all
	document.querySelectorAll('.task-tile').forEach(t => t.classList.remove('active'));
	// Set active class on clicked one
	tile.classList.add('active');
	// Save selected task
	selectedTask = tile.dataset.task;
	console.log("🎯 Task selected:", selectedTask);
	// Recheck if Start button can be enabled
	validateSelections();
	// Close modal if open
	if (taskOptionsModal) taskOptionsModal.style.display = 'none';
}

document.querySelectorAll('.task-tile').forEach(tile => {
	tile.addEventListener('click', () => handleTaskClick(tile));
});

// ----------------------
// Staff & Job select listeners
// ----------------------
//['staff-select', 'job-select'].forEach(id => {
//	const el = document.getElementById(id);
//	if (el) el.addEventListener('change', validateSelections);
//});

// ----------------------
// Select2 initialization
// ----------------------
// ----------------------
// Select2 initialization
// ----------------------
$(function () {
    $('#staff-select').select2({ width: '100%', placeholder: '-- Select Staff --' });
    $('#job-select').select2({ width: '100%', placeholder: '-- Select Job --' });
});

// Delegated listeners (catch even if select2 refreshes DOM)
$(document).on('change', '#staff-select', function () {
    console.log("👤 Staff changed →", $(this).val());
    validateSelections();
});

$(document).on('change', '#job-select', function () {
    console.log("📋 Job changed →", $(this).val());
    validateSelections();
});


// ----------------------
// Initial state
// ----------------------
document.addEventListener('DOMContentLoaded', () => {
	const startBtn = document.getElementById('start-btn');
	startBtn.disabled = true; // default state
	validateSelections();
});

// ----------------------
// Task options modal
// ----------------------
const taskOptionsModal = document.getElementById('taskOptionsModal');
const closeTaskOptions = document.getElementById('closeTaskOptions');
const viewRunningJobsBtn = document.getElementById('view-running-jobs-btn');

if (viewRunningJobsBtn) {
	viewRunningJobsBtn.addEventListener('click', (e) => {
		e.preventDefault();
		taskOptionsModal.style.display = 'flex';
	});
}

if (closeTaskOptions) {
	closeTaskOptions.addEventListener('click', () => {
		taskOptionsModal.style.display = 'none';
	});
}

window.addEventListener('click', (e) => {
	if (e.target === taskOptionsModal) {
		taskOptionsModal.style.display = 'none';
	}
});

// ----------------------
// Start button action
// ----------------------
document.addEventListener('DOMContentLoaded', () => {
	const startBtn = document.getElementById('start-btn');

	startBtn.addEventListener('click', async (e) => {
		e.preventDefault();
		const staffName = document.getElementById('staff-select').value.trim();
		const jobId = document.getElementById('job-select').value.trim();

		console.log("🔘 Start button clicked with:", { staffName, jobId, selectedTask });

		if (!staffName || !jobId || !selectedTask) {
			alert("Please select staff, job, and a task.");
			return;
		}

		try {
			const res = await fetch(`${BASE_URL}/start-job`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ staffName, jobId, task: selectedTask })
			});
			const data = await res.json();
			console.log("📦 Server response:", data);
			alert(data.message || "Job started!");
		} catch (err) {
			console.error("❌ Error starting job:", err);
			alert("Failed to start job. Please try again.");
		}
	});
});
