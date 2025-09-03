let BASE_URL = "";
let selectedTask = null;
let currentPage = 1;
const pageSize = 10; // 👈 number of rows per page


document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ main.js loaded");

    const staffSelect = document.getElementById("staff-select");
    const jobSelect = document.getElementById("job-select");
    const startBtn = document.getElementById("start-btn");
    const stopBtn = document.getElementById("stop-btn");
    const messageDiv = document.getElementById("message");
    const finishBtn = document.getElementById("finish-btn");

    if (startBtn) startBtn.disabled = true;


    // ----------------- TASK TILE -----------------
    document.querySelectorAll(".task-tile").forEach(tile => {
        tile.addEventListener("click", () => {
            document.querySelectorAll(".task-tile").forEach(t => t.classList.remove("active"));
            tile.classList.add("active");
            selectedTask = tile.dataset.task;
            console.log("🎯 Task selected:", selectedTask);
            validateSelections();
        });
    });

    function validateSelections() {
        const staff = staffSelect.value.trim();
        const job = jobSelect.value.trim();
        startBtn.disabled = !(staff && job && selectedTask);
    }
    if (staffSelect) staffSelect.addEventListener("change", validateSelections);
    if (jobSelect) jobSelect.addEventListener("change", validateSelections);

    // ----------------- START JOB -----------------
    if (startBtn) {
        startBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            const staffName = staffSelect.value.trim();
            const jobId = jobSelect.value.trim();

            if (!staffName || !jobId || !selectedTask) {
                showMessage("Please select staff, job, and task", "error");
                return;
            }

            console.log("🔘 Start clicked:", { staffName, jobId, selectedTask });

            const result = await startJobWithConflictResolution(staffName, jobId, selectedTask);

            if (result.ok) {
                showMessage("✅ Job started successfully!", "success");
                // Auto-open/refresh the running list for this task
                await fetchRunningJobs(selectedTask);
                const title = document.getElementById("running-jobs-title");
                if (title) title.textContent = `Running Jobs — ${selectedTask}`;
                const section = document.getElementById("running-jobs-section");
                if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
            } else if (result.cancelled) {
                showMessage("Operation cancelled", "info");
            } else {
                showMessage(result.error || "Failed to start job", "error");
            }
        });
    }

    // ----------------- STOP JOB -----------------

    if (stopBtn) {
        stopBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const staffName = staffSelect.value.trim();
            const jobId = jobSelect.value.trim();

            if (!staffName || !jobId) {
                showMessage("Please select staff and job before stopping.", "error");
                return;
            }

            try {
                const res = await fetch(`${BASE_URL}/stop-job`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ staffName, jobId })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to stop job");

                showMessage("⏹️ Job stopped successfully", "success");
                console.log("📦 Stop response:", data);
            } catch (err) {
                console.error("💥 Error stopping job:", err);
                showMessage(err.message, "error");
            }
        });
    }


    // ----------------- FINISH JOB -----------------
    if (finishBtn) {
        finishBtn.addEventListener("click", async (event) => {
            event.preventDefault();
            const jobId = jobSelect.value.trim();

            if (!jobId) {
                alert("Please select a job.");
                return;
            }

            try {
                const res = await fetch(`${BASE_URL}/finish-job`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ jobId })
                });
                const data = await res.json();

                console.log("📦 Finish response:", data);
                if (data.message) {
                    const laborCost = (typeof data.laborCost === "number" && !isNaN(data.laborCost))
                        ? data.laborCost.toFixed(2)
                        : "N/A";
                    const totalLaborCost = (typeof data.totalLaborCost === "number" && !isNaN(data.totalLaborCost))
                        ? data.totalLaborCost.toFixed(2)
                        : "N/A";

                    // Fill modal body
                    const bodyEl = document.getElementById("finishResultBody");
                    bodyEl.innerHTML = `
                    <p><strong>${data.message}</strong></p>
                    <p>Labor Cost: <span class="text-success">$${laborCost}</span></p>
                    <p>Total Labor Cost: <span class="text-primary">$${totalLaborCost}</span></p>
                `;

                    const finishModal = new bootstrap.Modal(document.getElementById("finishResultModal"));
                    finishModal.show();
                } else {
                    const bodyEl = document.getElementById("finishResultBody");
                    bodyEl.innerHTML = `<p class="text-danger">Failed to finish the job.</p>`;
                    const finishModal = new bootstrap.Modal(document.getElementById("finishResultModal"));
                    finishModal.show();
                }

            } catch (err) {
                console.error("💥 Error finishing job:", err);
                showMessage("Failed to finish job", "error");
            }
        });
    }

    // --- Move to Finished Jobs from inside End Job modal ---
    const moveJobInModalBtn = document.getElementById("moveJobInModalBtn");
    if (moveJobInModalBtn) {


        moveJobInModalBtn.addEventListener("click", async () => {
            const jobId = jobSelect?.value?.trim();
            if (!jobId) {
                document.getElementById("finishResultBody").innerHTML +=
                    `<p class="text-danger mt-2">Please select a job first.</p>`;
                return;
            }

            try {
                const res = await fetch(`${BASE_URL}/has-clockinout-records?jobId=${encodeURIComponent(jobId)}`);
                const data = await res.json();

                if (!data.hasRecords) {
                    // Reuse your existing confirm modal if available
                    if (typeof showConfirmNoClockModal === "function") {
                        showConfirmNoClockModal(() => doMoveJobFromModal(jobId));
                    } else {
                        const proceed = confirm("No clock-in/out records found for this job. Move anyway?");
                        if (proceed) doMoveJobFromModal(jobId);
                    }
                } else {
                    doMoveJobFromModal(jobId);
                }
            } catch (err) {
                console.error("Error checking job records:", err);
                document.getElementById("finishResultBody").innerHTML +=
                    `<p class="text-danger mt-2">Error checking job records: ${err.message}</p>`;
            }
        });
    }

    // ----------------- MESSAGE HELPER -----------------
    function showMessage(text, type) {
        const colors = { error: "red", success: "green", info: "blue" };
        messageDiv.textContent = text;
        messageDiv.style.color = colors[type] || "black";
    }

    // ----------------- FETCH STAFF -----------------
    async function fetchStaff() {

        const el = document.getElementById("staff-select");
        if (!el) {
            console.warn("⚠️ staff-select element not found — skipping staff fetch.");
            return;
        }
        try {
            const res = await fetch(`${BASE_URL}/get-staff`);
            if (!res.ok) throw new Error("Failed to fetch staff");
            const data = await res.json();

            staffSelect.innerHTML = '<option value="">-- Select Staff --</option>';

            data.staff.forEach(s => {
                const name = typeof s === "string" ? s : (s.name || s.staffName || JSON.stringify(s));
                const opt = document.createElement("option");
                opt.value = name;
                opt.textContent = name;
                staffSelect.appendChild(opt);
            });

            console.log("✅ Staff loaded:", data.staff);
        } catch (err) {
            console.error("💥 Error fetching staff:", err);
        }
    }


    // After staff are appended in fetchStaff()
    $('#staff-select').select2({
        placeholder: "Search staff...",
        allowClear: true,
        width: '100%'  // makes it match Bootstrap form-control width
    });

    // After jobs are appended in fetchJobs()
    $('#job-select').select2({
        placeholder: "Search job...",
        allowClear: true,
        width: '100%'
    });


    // ----------------- CONFIG -----------------
    async function fetchConfig() {
        try {
            const res = await fetch("/get-config");
            const cfg = await res.json();
            BASE_URL = cfg.base_url;
            console.log("✅ BASE_URL set to:", BASE_URL);

            await fetchStaff();
            await fetchJobs();
        } catch (err) {
            console.warn("⚠️ Could not load /get-config, using fallback");
            BASE_URL = window.location.origin.replace(/:\d+$/, ":4003");
            await fetchStaff();
            await fetchJobs();
        }
    }

    fetchConfig();


    // ----------------- VIEW RUNNING JOBS MODAL -----------------
    const viewRunningJobsBtn = document.getElementById("view-running-jobs-btn");
    const taskOptionsModalEl = document.getElementById("taskOptionsModal");

    if (viewRunningJobsBtn && taskOptionsModalEl) {
        const taskOptionsModal = new bootstrap.Modal(taskOptionsModalEl);

        viewRunningJobsBtn.addEventListener("click", (e) => {
            e.preventDefault();
            taskOptionsModal.show();
        });
    }

    // ----------------- FETCH RUNNING JOBS -----------------
    async function fetchRunningJobs(filterTask = null) {
        const section = document.getElementById("running-jobs-section");
        const table = document.getElementById("running-jobs-table");
        const tbody = table?.querySelector("tbody");
        const thead = table?.querySelector("thead");
        const titleEl = document.getElementById("running-jobs-title");

        if (!section || !table || !tbody || !thead) {
            console.error("❌ Running jobs table elements not found");
            return;
        }

        // Update section title
        if (titleEl) {
            titleEl.textContent = filterTask ? `Running Jobs - ${filterTask}` : "Running Jobs";
        }

        // Reset table before loading
        tbody.innerHTML = "";
        section.style.display = "none";
        if (messageDiv) {
            messageDiv.textContent = "Loading running jobs...";
            messageDiv.style.color = "black";
        }

        try {
            // ✅ Let backend do filtering
            let url = `${BASE_URL}/view-running-jobs`;
            if (filterTask && filterTask !== "ALL") {
                url += `?task=${encodeURIComponent(filterTask)}`;
            }

            const res = await fetch(url);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch running jobs");

            const jobs = data.runningJobs || [];

            if (!jobs.length) {
                if (messageDiv) {
                    messageDiv.textContent = filterTask
                        ? `No running jobs for "${filterTask}"`
                        : "No running jobs found.";
                    messageDiv.style.color = "gray";
                }
                return;
            }

            // Render table rows
            jobs.forEach(job => {
                const tr = document.createElement("tr");
                const start = job.startTime ? new Date(job.startTime) : null;
                const startStr = start
                    ? `${start.toLocaleDateString("en-GB")} ${start.toLocaleTimeString("en-GB", { hour12: false })}`
                    : "";

                tr.innerHTML = `
                <td>${job.staffName || ""}</td>
                <td>${job.jobId || ""}</td>
                <td>${job.customerName || ""}</td>
                <td>${job.drawNumber || job.drawingNumber || ""}</td>
                <td>${job.task || ""}</td>
                <td>${startStr}</td>
                <td>
                    <button class="stop-running btn btn-danger btn-sm" 
                            data-staff="${job.staffName}" 
                            data-job="${job.jobId}">
                        Stop
                    </button>
                </td>
            `;
                tbody.appendChild(tr);
            });

            // ✅ Show section after successful render
            section.style.display = "block";
            if (messageDiv) messageDiv.textContent = "";

        } catch (err) {
            console.error("❌ Error fetching running jobs:", err);
            if (messageDiv) {
                messageDiv.textContent = err.message;
                messageDiv.style.color = "red";
            }
        }
    }


    const jobsStatusBtn = document.getElementById("jobs-status-btn");
    if (jobsStatusBtn) {
        jobsStatusBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            await fetchAllRecords();   // defined below
        });
    }

    const staffDeleteLink = document.getElementById("openDeleteStaffModal");
    if (staffDeleteLink) {
        staffDeleteLink.addEventListener("click", async (e) => {
            e.preventDefault();
            const modalEl = document.getElementById("deleteStaffModal");
            const select = document.getElementById("deleteStaffSelect");
            select.innerHTML = '<option value="">-- Select Staff --</option>';

            try {
                const res = await fetch(`${BASE_URL}/get-staff`);
                const data = await res.json();
                data.staff.forEach(s => {
                    const name = typeof s === "string" ? s : (s.name || s.staffName || "");
                    if (name) {
                        const opt = document.createElement("option");
                        opt.value = name;
                        opt.textContent = name;
                        select.appendChild(opt);
                    }
                });
            } catch (err) {
                console.error("💥 Error loading staff:", err);
            }
            new bootstrap.Modal(modalEl).show();
        });
    }

    document.getElementById("confirmDeleteStaffBtn")?.addEventListener("click", async () => {
        const staffName = document.getElementById("deleteStaffSelect").value;
        if (!staffName) return alert("Please select a staff member to delete.");
        try {
            const res = await fetch(`${BASE_URL}/delete-staff`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ staffName })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete staff");
            alert(data.message || "Staff deleted successfully");
            fetchStaff();
            bootstrap.Modal.getInstance(document.getElementById("deleteStaffModal")).hide();
        } catch (err) {
            alert("❌ Error: " + err.message);
        }
    });

    // ----------------- DELETE JOB MODAL -----------------
    const jobDeleteLink = document.getElementById("openDeleteJobModal");
    if (jobDeleteLink) {
        jobDeleteLink.addEventListener("click", async (e) => {
            e.preventDefault();
            const modalEl = document.getElementById("deleteJobModal");
            const select = document.getElementById("deleteJobSelect");
            select.innerHTML = '<option value="">-- Select Job --</option>';

            try {
                const res = await fetch(`${BASE_URL}/get-jobs`);
                const data = await res.json();
                data.jobs.forEach(j => {
                    const opt = document.createElement("option");
                    opt.value = j.jobId;
                    opt.textContent = `${j.jobId} - ${j.customer || ""}`;
                    select.appendChild(opt);
                });
            } catch (err) {
                console.error("💥 Error loading jobs:", err);
            }
            new bootstrap.Modal(modalEl).show();
        });
    }

    document.getElementById("confirmDeleteJobBtn")?.addEventListener("click", async () => {
        const jobId = document.getElementById("deleteJobSelect").value;
        if (!jobId) return alert("Please select a job to delete.");
        try {
            const res = await fetch(`${BASE_URL}/delete-job`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete job");
            alert(data.message || "Job deleted successfully");
            fetchJobs();
            bootstrap.Modal.getInstance(document.getElementById("deleteJobModal")).hide();
        } catch (err) {
            alert("❌ Error: " + err.message);
        }
    });

    document.getElementById("saveEditTimeBtn")?.addEventListener("click", async () => {
        const recordId = document.getElementById('editRecordId').value;
        const newStart = document.getElementById('editStartTime').value.trim();
        const newStop = document.getElementById('editStopTime').value.trim();
        const messageDiv = document.getElementById('message');

        if (!newStart) {
            alert("Start time is required");
            return;
        }

        try {
            const res = await fetch(`${BASE_URL}/edit-clock`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-User-Role": localStorage.getItem("userRole") || "user"
                },
                body: JSON.stringify({
                    recordId,
                    newStartTime: newStart,
                    newStopTime: newStop || null
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Failed to update record");

            messageDiv.textContent = result.message || "Record updated successfully!";
            messageDiv.style.color = "green";

            // Close modal
            bootstrap.Modal.getInstance(document.getElementById("editTimeModal")).hide();

            // Refresh records table
            await fetchAllRecords();
        } catch (err) {
            console.error("Error editing job:", err);
            messageDiv.textContent = `Error editing job: ${err.message}`;
            messageDiv.style.color = "red";
        }
    });

    document.getElementById("confirmDeleteTimeBtn")?.addEventListener("click", async () => {
        const recordId = document.getElementById("deleteRecordId").value;
        if (!recordId) return;

        const msgBox = document.getElementById("deleteMessage");
        msgBox.textContent = "Deleting...";
        msgBox.style.color = "black";

        try {
            const res = await fetch(`${BASE_URL}/delete-clock`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-User-Role": localStorage.getItem("userRole") || "user"
                },
                body: JSON.stringify({ recordId })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete record");

            // ✅ Show success inside modal
            msgBox.textContent = data.message || "Record deleted successfully!";
            msgBox.style.color = "green";

            // When modal closes, refresh table
            const modalEl = document.getElementById("deleteTimeModal");
            modalEl.addEventListener("hidden.bs.modal", async () => {
                await fetchAllRecords();
                msgBox.textContent = ""; // clear message for next time
            }, { once: true });

        } catch (err) {
            console.error("❌ Error deleting record:", err);
            msgBox.textContent = "Error deleting record: " + err.message;
            msgBox.style.color = "red";
        }
    });

    document.querySelectorAll(".task-tile-option").forEach(tile => {
        tile.addEventListener("click", () => {
            const task = tile.dataset.task;
            console.log("📌 Selected task:", task);

            // Close modal
            bootstrap.Modal.getInstance(document.getElementById("taskOptionsModal")).hide();

            // Fetch jobs
            if (task === "ALL") {
                fetchRunningJobs(null);  // no filter
            } else {
                fetchRunningJobs(task);
            }
        });
    });

    const runningJobsTbody = document.querySelector("#running-jobs-table tbody");
    if (runningJobsTbody) {
        runningJobsTbody.onclick = async (e) => {
            if (e.target.classList.contains("stop-running")) {
                const staffName = e.target.dataset.staff;
                const jobId = e.target.dataset.job;

                try {
                    const res = await fetch(`${BASE_URL}/stop-job`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ staffName, jobId })
                    });
                    const out = await res.json();
                    if (!res.ok) throw new Error(out.error || "Failed to stop job");

                    if (messageDiv) {
                        messageDiv.textContent = `⏹️ Stopped job ${jobId} for ${staffName}`;
                        messageDiv.style.color = "green";
                    }

                    // Refresh with the same filter
                    fetchRunningJobs();
                } catch (err) {
                    if (messageDiv) {
                        messageDiv.textContent = err.message;
                        messageDiv.style.color = "red";
                    }
                }
            }
        };
    }

    const avBtn = document.querySelector(".searchAv");
    if (avBtn) {
        avBtn.addEventListener("click", async () => {
            const stockCode = document.getElementById("stockCode").value.trim();
            if (!stockCode) {
                alert("Please enter a Stock Code");
                return;
            }

            try {
                const response = await fetch(`${BASE_URL}/get-av?stockCode=${encodeURIComponent(stockCode)}`);
                const data = await response.json();

                const resultDiv = document.getElementById("avResult");
                if (data.error) {
                    resultDiv.innerHTML = `<p class="text-danger">${data.error}</p>`;
                } else {
                    resultDiv.innerHTML = `
          <p><strong>AV:</strong> ${data.avValue}</p>
          <p><strong>Draw No:</strong> ${data.drawNo}</p>
        `;
                }
            } catch (err) {
                console.error("Error fetching AV:", err);
            }
        });
    }



}); // end DOMContentLoaded

function showSpinner() {
    const el = document.getElementById("spinner");
    if (el) el.style.display = "flex";
}
function hideSpinner() {
    const el = document.getElementById("spinner");
    if (el) el.style.display = "none";
}

async function apiStartJob(staffName, jobId, task) {
    const res = await fetch(`${BASE_URL}/start-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffName, jobId, task })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
}

async function apiStopJob(staffName, jobId) {
    const res = await fetch(`${BASE_URL}/stop-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffName, jobId })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
}

/** Try to start; if backend says “already working on job X”, offer to stop X and switch */
async function startJobWithConflictResolution(staffName, jobId, task) {
    showSpinner();
    try {
        // 1) Try to start
        let { ok, data } = await apiStartJob(staffName, jobId, task);
        if (ok) return { ok: true, data };

        // 2) Parse the “already working” message
        const errMsg = (data?.error || "").toString();
        const m = errMsg.match(/already\s+working\s+on\s+job\s+["']?([A-Za-z0-9._\- ]+)["']?/i);
        const activeJobId = m ? m[1] : null;

        if (activeJobId) {
            // Hide spinner before opening modal (prevents focus/aria warnings)
            hideSpinner();
            const proceed = await showConfirmModal({
                title: "Switch running job?",
                body: `
                    <p><strong>${staffName}</strong> is already working on job <strong>${activeJobId}</strong>.</p>
                    <p>Do you want to <strong>stop ${activeJobId}</strong> and start <strong>${jobId}</strong> (task: <strong>${task}</strong>) instead?</p>
                `,
                confirmText: "Stop & Start",
                cancelText: "Cancel"
            });

            if (!proceed) return { ok: false, cancelled: true, error: errMsg };

            // Re-show spinner for the stop+start sequence
            showSpinner();

            // 3) Stop current
            const stop = await apiStopJob(staffName, activeJobId);
            if (!stop.ok) {
                return { ok: false, error: stop.data?.error || `Failed to stop job ${activeJobId}` };
            }

            // 4) Retry start
            const retry = await apiStartJob(staffName, jobId, task);
            if (retry.ok) return { ok: true, data: retry.data };
            return { ok: false, error: retry.data?.error || "Failed to start job after stopping previous one" };
        }

        // 5) Not a recognized conflict
        return { ok: false, error: errMsg || "Failed to start job" };
    } finally {
        hideSpinner();
    }
}


async function showConfirmModal({ title, body, confirmText = "Yes", cancelText = "Cancel" }) {
    return new Promise((resolve) => {
        const el = document.getElementById("confirmModal");
        const titleEl = document.getElementById("confirmModalTitle");
        const bodyEl = document.getElementById("confirmModalBody");
        const okBtn = document.getElementById("confirmModalConfirmBtn");
        const cancelBtn = document.getElementById("confirmModalCancelBtn");

        if (!el || !titleEl || !bodyEl || !okBtn || !cancelBtn) {
            console.warn("⚠️ confirmModal elements missing; falling back to native confirm()");
            resolve(window.confirm(typeof body === "string" ? body : "Are you sure?"));
            return;
        }

        titleEl.textContent = title || "Confirm action";
        bodyEl.innerHTML = typeof body === "string" ? body : "";
        okBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;

        const modal = new bootstrap.Modal(el, { backdrop: "static", keyboard: true });

        const cleanup = () => {
            okBtn.removeEventListener("click", onOk);
            el.removeEventListener("hidden.bs.modal", onCancelIfHidden);
        };

        const onOk = () => {
            cleanup();
            modal.hide();
            resolve(true);
        };

        const onCancelIfHidden = () => {
            cleanup();
            resolve(false);
        };

        okBtn.addEventListener("click", onOk);
        el.addEventListener("hidden.bs.modal", onCancelIfHidden);

        // IMPORTANT: ensure spinner is hidden so focus isn’t trapped behind it
        hideSpinner();
        modal.show();
    });
}


//JOB Status
async function fetchAllRecords(page = 1) {
    const table = document.getElementById('records-table');
    const thead = table?.querySelector('thead');
    const tbody = table?.querySelector('tbody');
    const msg = document.getElementById('message');

    showSpinner();
    tbody.innerHTML = '';
    table.style.display = 'none';

    try {
        const res = await fetch(`${BASE_URL}/view-times?page=${page}&page_size=${pageSize}&filter_column=all&filter_value=`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to fetch records");

        renderRecordsTable(data.records, thead, tbody);

        table.style.display = data.records.length ? 'table' : 'none';
        msg.textContent = data.records.length ? '' : 'No records found';

        // ✅ Use backend-provided totalPages
        updatePaginationControls(data.totalPages, data.currentPage);
    } catch (err) {
        console.error("Error:", err);
        msg.textContent = err.message;
        msg.style.color = "red";
    } finally {
        hideSpinner();
    }
}



function renderRecordsTable(records, thead, tbody) {
    thead.innerHTML = `
    <tr>
      <th>Staff Name</th>
      <th>Job ID</th>
      <th>Task </th>
      <th>Customer</th>
      <th>Drawing Number</th>
      <th>Start Time</th>
      <th>Stop Time</th>
      <th>Worked Hours</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  `;
    tbody.innerHTML = '';

    records.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${escapeHtml(r.staffName)}</td>
      <td>${escapeHtml(r.jobId)}</td>
      <td>${escapeHtml(r.task || 'N/A')}</td> 
      <td>${escapeHtml(r.customerName)}</td>
      <td>${escapeHtml(r.drawingNumber || r.drawNumber || '')}</td>
      <td>${escapeHtml(r.startTime)}</td>
      <td>${escapeHtml(r.stopTime || 'In Progress')}</td>
      <td>${num2(r.totalHoursWorked)} hrs</td>
      <td>${escapeHtml(r.status || 'Active')}</td>
      <td>
      <button class="btn btn-sm btn-primary me-1"
        onclick="editTime('${r.recordId}','${r.startTime}','${r.stopTime}')">
        ✏️ Edit
      </button>
      <button class="btn btn-sm btn-danger"
        onclick="deleteTime('${r.recordId}')">
        🗑 Delete
      </button>
    </td>
    `;
        tbody.appendChild(tr);
    });
    tbody.querySelectorAll(".edit-record").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const recordId = e.currentTarget.dataset.id;
            console.log("Edit clicked:", recordId);

            // Example: open modal or redirect
            openEditModal(recordId);
        });
    });

}

function editTime(recordId, currentStart, currentStop) {
    // Fill modal fields
    document.getElementById('editRecordId').value = recordId;
    document.getElementById('editStartTime').value = currentStart;
    document.getElementById('editStopTime').value = currentStop === "In Progress" ? "" : currentStop;

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('editTimeModal'));
    modal.show();
}

function deleteTime(recordId) {
    // Save recordId into hidden field
    document.getElementById('deleteRecordId').value = recordId;

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('deleteTimeModal'));
    modal.show();
}




function escapeHtml(s) {
    return (s ?? '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function num2(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : '';
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
                    window.location.reload();
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


// Function to close the modal
function closeModal(modalId) {
    var modal = document.getElementById("modal-" + modalId);
    if (modal) {
        modal.style.display = "none";
    }
}

function doMoveJobFromModal(jobId) {
    fetch(`${BASE_URL}/move-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId })
    })
        .then(res => res.json())
        .then(data => {
            document.getElementById("finishResultBody").innerHTML += `
        <p class="mt-2 ${data?.message ? "text-success" : "text-danger"}">
          ${data?.message || "Job moved successfully!"}
        </p>
      `;
            fetchJobs(); // refresh dropdown
            document.getElementById("moveJobInModalBtn").disabled = true; // prevent double move
        })
        .catch(err => {
            console.error("Error moving job:", err);
            document.getElementById("finishResultBody").innerHTML +=
                `<p class="text-danger mt-2">Error moving job: ${err.message}</p>`;
        });
}


// ----------------- FETCH JOBS -----------------
async function fetchJobs() {

    const el = document.getElementById("job-select");
    if (!el) {
        console.warn("❌ jobSelect element not found — skipping job fetch.");
        return;
    }
    try {
        const res = await fetch(`${BASE_URL}/get-jobs`);
        if (!res.ok) throw new Error("Failed to fetch jobs");
        const data = await res.json();

        const jobSelect = document.getElementById("job-select");
        if (!jobSelect) {
            console.error("❌ jobSelect element not found");
            return;
        }

        jobSelect.innerHTML = '<option value="">-- Select Job --</option>';
        data.jobs.forEach(j => {
            const opt = document.createElement("option");
            opt.value = j.jobId;
            opt.textContent = `${j.jobId} - ${j.customer || ""}`;
            jobSelect.appendChild(opt);
        });

        console.log("✅ Jobs loaded:", data.jobs.length);
    } catch (err) {
        console.error("💥 Error fetching jobs:", err);
    }
}


function logout() {
    localStorage.clear(); // Clear stored role and username
    window.location.href = "Login"; // Redirect to login page
}

function updatePaginationControls(totalPages, page) {
    const controls = document.getElementById("pagination-controls");
    const pageInfo = document.getElementById("page-info");
    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");

    if (!controls) return;

    controls.style.display = totalPages > 1 ? "block" : "none";
    pageInfo.textContent = `Page ${page} of ${totalPages}`;

    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= totalPages;

    prevBtn.onclick = () => fetchAllRecords(page - 1);
    nextBtn.onclick = () => fetchAllRecords(page + 1);
}


