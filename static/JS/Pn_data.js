
// Define backend URL
// const backendBaseUrl = `http://10.0.0.80:${window.location.port === "3004" ? 3003 : 3000}`;

const BACKEND_IP = "10.0.0.80";
const backendBaseUrl = "http://10.0.0.80:4003";


let currentEditRow = null;
let originalRowData = null;
let thead, tbody;
document.addEventListener('DOMContentLoaded', () => {
    // Initialize elements
    const filterColumn = document.getElementById('filter-column');
    const filterInput = document.getElementById('filter-input');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const table = document.getElementById('pn-data-table');
    thead = table.querySelector('thead');
    tbody = document.getElementById('pn-data-table-body');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    // Initialize edit controls
    saveEditBtn.addEventListener('click', saveRowEdit);
    cancelEditBtn.addEventListener('click', cancelRowEdit);

    // Fetch data and build table
    fetchPNData();

    function fetchPNData() {
        console.log("Fetching PN_DATA...");
        fetch(`${backendBaseUrl}/get-pn-data`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        })
            .then(response => {
                if (!response.ok) throw new Error(`Failed to fetch PN_DATA: ${response.status}`);
                return response.json();
            })
            .then(data => {
                console.log("PN_DATA fetched successfully:", data);

                // Get all records (handle both array and single object responses)
                const records = Array.isArray(data) ? data : [data];

                // Get all unique column names from the data
                let columns = records.length > 0 ? Object.keys(records[0]) : [];

                // Reorder "PRODUCTION READY DATE" to follow "INPUT DATE"
                const inputIndex = columns.indexOf("INPUT DATE");
                const readyIndex = columns.indexOf("PRODUCTION READY DATE");

                if (inputIndex !== -1 && readyIndex !== -1 && readyIndex !== inputIndex + 1) {
                    const [readyCol] = columns.splice(readyIndex, 1); // remove
                    columns.splice(inputIndex + 1, 0, readyCol);       // insert next to INPUT DATE
                }


                // Build table header dynamically
                buildTableHeader(columns);

                // Populate table body
                populateTableBody(records, columns);

                // Initialize filter column dropdown
                initFilterColumn(columns);
            })
            .catch(error => {
                console.error("Error fetching PN_DATA:", error);
                tbody.innerHTML = `<tr><td colspan="100%">Error loading data: ${error.message}</td></tr>`;
            });
    }

    function buildTableHeader(columns) {
        thead.innerHTML = '';
        const headerRow = document.createElement('tr');

        // Add Edit column header
        const editHeader = document.createElement('th');
        editHeader.textContent = 'Actions';
        editHeader.style.width = '80px';
        headerRow.appendChild(editHeader);

        // Filter out the columns you want to hide
        const hiddenColumns = ["backorder"];
        const visibleColumns = columns.filter(col => !hiddenColumns.includes(col));


        // Add data column headers
        visibleColumns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = (col === "EXCLUDE_SAVE_TIME") ? "New pack" : col;
            // Attach sorting functionality to END-DATE column
            if (col === 'END DATE') {
                th.style.cursor = 'pointer';
                th.addEventListener('click', sortTableByEndDate);
            }
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
    }

    function populateTableBody(records, columns) {
        tbody.innerHTML = '';
        const hiddenColumns = ["backorder"];
        const visibleColumns = columns.filter(col => !hiddenColumns.includes(col));
        records.forEach(row => {
            const tr = document.createElement('tr');
            tr.dataset.pn = row['PN'] || '';

            if (
                row['backorder'] === true ||
                row['backorder'] === 1 ||
                row['backorder'] === "1" ||
                row['backorder'] === "true"
            ) {
                tr.classList.add('backorder-row');
            }
            // Add edit button cell
            const editCell = document.createElement('td');
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-row-btn';
            editBtn.textContent = '✏️Edit';
            editBtn.onclick = () => startRowEdit(tr, row, visibleColumns);
            editCell.appendChild(editBtn);
            tr.appendChild(editCell);

            // Add data cells
            visibleColumns.forEach(col => {
                const td = document.createElement('td');
                if (col === "EXCLUDE_SAVE_TIME") {
                    td.textContent = (row[col] == 1) ? "Yes" : "No";
                    td.style.fontWeight = "bold";
                    td.style.color = (row[col] == 1) ? "#388e3c" : "#888";
                } else {
                    td.textContent = row[col] || ' ';
                }
                td.dataset.column = col;
                tr.appendChild(td);
            });

            // Apply date highlighting to the entire row based on the REQU-DATE column
            if (row['REQU-DATE']) {
                applyDateHighlighting(tr, row['REQU-DATE']);
            }

            tbody.appendChild(tr);
        });
    }

    function initFilterColumn(columns) {
        filterColumn.innerHTML = '<option value="all">All Columns</option>';

        columns.forEach((col, index) => {
            const option = document.createElement('option');
            option.value = index + 1; // +1 because of the added Edit column
            option.textContent = col;
            filterColumn.appendChild(option);
        });
    }

    function applyDateHighlighting(rowElement, requDate) {
        if (!requDate) return;

        const today = new Date();
        const reqDate = new Date(requDate);
        const diffTime = reqDate - today;
        const diffDays = Math.ceil(diffTime / 86400000); // 86400000 ms per day

        // Remove any existing highlighting classes
        rowElement.classList.remove('date-critical', 'date-warning');

        if (diffDays <= 3 && diffDays >= 0) { // 3 days or less - orange
            rowElement.classList.add('date-warning');
        } else if (diffDays < 0) { // past due - red
            rowElement.classList.add('date-critical');
        }
    }

    function filterTable() {
        const columnIndex = filterColumn.value === 'all' ? -1 : parseInt(filterColumn.value);
        const filterValue = filterInput.value.toLowerCase();
        const rows = tbody.querySelectorAll('tr');

        rows.forEach(row => {
            let matchFound = false;
            const cells = row.querySelectorAll('td');

            if (columnIndex === -1) { // Search all columns
                cells.forEach(cell => {
                    if (cell.textContent.toLowerCase().includes(filterValue)) {
                        matchFound = true;
                    }
                });
            } else if (columnIndex < cells.length) { // Search specific column
                matchFound = cells[columnIndex].textContent.toLowerCase().includes(filterValue);
            }

            row.style.display = matchFound ? '' : 'none';
        });
    }

    function clearFilters() {
        filterColumn.value = 'all';
        filterInput.value = '';
        filterTable();
    }

    function startRowEdit(tr, rowData, columns) {
        if (currentEditRow) {
            cancelRowEdit();
        }

        currentEditRow = tr;
        originalRowData = { ...rowData }; // Create a new copy of the data

        // Replace all cells with inputs (except the action cell)
        Array.from(tr.children).slice(1).forEach(td => {
            const col = td.dataset.column;
            let value = rowData[col] || '';


            if (col === "EXCLUDE_SAVE_TIME") {
                // Leave cell blank or write a placeholder, since dropdown appears below
                td.innerHTML = ""; // or td.innerHTML = "(see below)";
            }
            // Special handling for date fields
            else if (col.includes('DATE')) {
                if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                    try {
                        const dateObj = new Date(value);
                        if (!isNaN(dateObj)) {
                            value = dateObj.toISOString().split('T')[0];
                        }
                    } catch (e) {
                        console.warn(`Couldn't parse date ${value}`, e);
                    }
                }
                td.innerHTML = `<input type="date" value="${value}" data-column="${col}">`;
            }
            // Special handling for numeric fields
            else if (col === 'QTY' || col === 'AV') {
                td.innerHTML = `<input type="number" step="0.01" value="${value}" data-column="${col}">`;
            }
            // EXCLUDE_SAVE_TIME: Special Job dropdown (only in edit mode)
            else if (col === undefined && !td.querySelector('button')) {
                // This is the "Actions" cell, skip
            }
            // Default text input
            else {
                td.innerHTML = `<input type="text" value="${value}" data-column="${col}">`;
            }
        });

        // Add Special Job dropdown below row (edit mode only)
        let specialJobRow = document.getElementById('special-job-row');
        if (specialJobRow) specialJobRow.remove(); // Remove existing if present

        specialJobRow = document.createElement('tr');
        specialJobRow.id = 'special-job-row';
        const cell = document.createElement('td');
        cell.colSpan = tr.children.length;
        cell.style.padding = '10px 20px';

        // Get original value for this row
        const specialVal = rowData['EXCLUDE_SAVE_TIME'] == 1 ? 1 : 0;
        cell.innerHTML = `
            <label style="font-weight:600;margin-right:10px;">
                New pack:
                <select id="special-job-dropdown" style="margin-left:10px;">
                    <option value="1" ${specialVal == 1 ? 'selected' : ''}>Yes</option>
                    <option value="0" ${specialVal == 0 ? 'selected' : ''}>No</option>
                </select>
            </label>
            <span style="color:#888;">(If Yes, actual time will be used for AV &amp; future jobs)</span>
        `;
        specialJobRow.appendChild(cell);

        // Insert special job row after current editing row
        tr.parentNode.insertBefore(specialJobRow, tr.nextSibling);

        // Change edit button to confirm
        const editBtn = tr.querySelector('.edit-row-btn');
        editBtn.textContent = '✅';
        editBtn.onclick = saveRowEdit;

        // Highlight the row being edited
        tr.classList.add('editing-row');

        // Show edit controls
        document.getElementById('edit-controls').style.display = 'block';
    }

    function cancelRowEdit() {
        if (!currentEditRow) return;

        // Restore original values from the backup
        Array.from(currentEditRow.children).slice(1).forEach(td => {
            const col = td.dataset.column;
            td.textContent = originalRowData[col] || 'N/A';

            // Reapply date highlighting if needed
            if (col === 'REQU-DATE') {
                applyDateHighlighting(td, originalRowData[col]);
            }
        });

        // Remove special job row if present
        let specialJobRow = document.getElementById('special-job-row');
        if (specialJobRow) specialJobRow.remove();

        // Restore edit button
        const editBtn = currentEditRow.querySelector('.edit-row-btn');
        editBtn.textContent = '✏️';
        editBtn.onclick = () => startRowEdit(currentEditRow, { ...originalRowData }, Object.keys(originalRowData));

        // Remove editing highlight
        currentEditRow.classList.remove('editing-row');

        // Hide edit controls
        document.getElementById('edit-controls').style.display = 'none';

        // Reset editing state
        currentEditRow = null;
        originalRowData = null;
        window.location.reload();
    }


    //endrow
    function endRowEdit() {
        if (!currentEditRow) return;

        // Restore edit button
        const editBtn = currentEditRow.querySelector('.edit-row-btn');
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => startRowEdit(currentEditRow, originalRowData, Object.keys(originalRowData));

        // Remove editing highlight
        currentEditRow.classList.remove('editing-row');

        // Hide edit controls
        document.getElementById('edit-controls').style.display = 'none';

        // Reset editing state
        currentEditRow = null;
        originalRowData = null;
    }
    async function saveRowEdit() {
        if (!currentEditRow) return;

        const pn = currentEditRow.dataset.pn;
        const updates = {};

        try {
            // Collect all changes
            Array.from(currentEditRow.querySelectorAll('input')).forEach(input => {
                const frontendCol = input.dataset.column;
                let value = input.value.trim();

                // Skip unchanged fields
                if (value === (originalRowData[frontendCol] || '').toString().trim()) {
                    return;
                }

                // Convert numbers for QTY/AV
                if (frontendCol === 'QTY' || frontendCol === 'AV') {
                    value = parseFloat(value);
                    if (isNaN(value)) {
                        throw new Error(`${frontendCol} must be a number`);
                    }
                }

                // Send the column name exactly as shown in the table
                updates[frontendCol] = value;
            });

            // Add Special Job dropdown value if changed
            const specialJobDropdown = document.getElementById('special-job-dropdown');
            if (specialJobDropdown) {
                const specialValue = parseInt(specialJobDropdown.value, 10);
                if (specialValue !== (originalRowData['EXCLUDE_SAVE_TIME'] == 1 ? 1 : 0)) {
                    updates['EXCLUDE_SAVE_TIME'] = specialValue;
                }
            }

            if (Object.keys(updates).length === 0) {
                cancelRowEdit();
                return;
            }

            console.log("Sending updates:", updates);

            // Show loading state
            const saveBtn = document.getElementById('save-edit-btn');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            const response = await fetch(`http://10.0.0.80:4003/update-pn-row`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pn, updates })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Update failed');
            }

            // Update UI on success
            Array.from(currentEditRow.children).slice(1).forEach(td => {
                const col = td.dataset.column;
                if (col in updates) {
                    td.textContent = updates[col];
                    if (col === 'REQU-DATE') {
                        applyDateHighlighting(td, updates[col]);
                    }
                }
            });

            showToast('Row updated successfully!', 'success');
            endRowEdit();
            window.location.reload();

        } catch (error) {
            console.error('Update failed:', error);
            showToast(`Update failed: ${error.message}`, 'error');
        } finally {
            const saveBtn = document.getElementById('save-edit-btn');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    }

    // Helper function to show toast messages
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    // Set up event listeners
    filterInput.addEventListener('input', filterTable);
    filterColumn.addEventListener('change', filterTable);
    clearFiltersBtn.addEventListener('click', clearFilters);



    //Sorting function in header
    let sortDirection = 1; // 1 for ascending, -1 for descending

    function sortTableByEndDate() {
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const endDateHeader = Array.from(thead.querySelectorAll('th')).find(th => th.textContent.includes('END DATE'));

        // Remove existing sorting symbols from all headers
        Array.from(thead.querySelectorAll('th')).forEach(th => {
            th.textContent = th.textContent.replace(/ ▲| ▼/g, '');
        });

        rows.sort((a, b) => {
            const dateA = new Date(a.querySelector('td[data-column="END DATE"]').textContent.trim());
            const dateB = new Date(b.querySelector('td[data-column="END DATE"]').textContent.trim());

            // Handle invalid dates
            if (isNaN(dateA)) return 1 * sortDirection;
            if (isNaN(dateB)) return -1 * sortDirection;

            return (dateA - dateB) * sortDirection;
        });

        // Toggle sort direction for next click
        sortDirection *= -1;

        // Add sorting symbol to the END-DATE header
        if (endDateHeader) {
            endDateHeader.textContent += sortDirection === 1 ? ' ▲' : ' ▼';
        }

        // Rebuild the table body with sorted rows
        tbody.innerHTML = '';
        rows.forEach(row => tbody.appendChild(row));
    }


});
