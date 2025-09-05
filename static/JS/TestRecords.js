const BACKEND_IP = "10.0.0.80";


let isEditMode = false;
// Load records on page load
document.addEventListener('DOMContentLoaded', loadTestRecords);
let currentCommentPn = '';


async function loadTestRecords() {
    try {
        const url = `${BASE_URL}/api/test-records`;
        console.log("🌍 Fetching:", url);

        const response = await fetch(url);
        const text = await response.text(); // read as plain text first
        console.log("📡 Raw response (first 200 chars):", text.slice(0, 200));

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        // Try to parse JSON
        const records = JSON.parse(text);
        renderRecords(records);
    } catch (error) {
        console.error("Error fetching test records:", error);
        alert(`Failed to load test records. Error: ${error.message}`);
    }
}



async function renderRecords(records) {
    const tableBody = document.querySelector('#testRecords tbody');
    const tableHead = document.querySelector('#testRecords thead');
    tableBody.innerHTML = '';
    tableHead.innerHTML = '';


    // Add static columns to the table header
    const staticColumns = `
                <th>Actions</th>
                <th>DATE</th>
                <th>PN</th>
                <th>DRAW NO</th>
                <th>NO/CELL</th>
                <th>CUSTOMER</th>
                <th>QTY</th>
                <th>AV</th>
                <th>ESTIMATED TIME</th>
                <th>TOTAL HOURS WORKED</th>
                <th>UNIT PRICE</th>
                <th>REMAINING TIME</th>
                <th>TEST TIME</th>
                <th>ORDER NO</th>
                <th>BILL PRICE</th>
                <th id="profitHeader" data-bs-toggle="tooltip" data-bs-placement="top" title="PROFIT = (UNIT Price * Qty)-(Total labor cost)-(Bill$ * Qty)">PROFIT</th>
                <th>Comment</th>
                <th>STOCK CODE</th>
                <th>PICTURE</th>
                <th>SALESMAN</th>
                <th>CUSTOMER CODE</th>
            `;
    tableHead.innerHTML = `<tr>${staticColumns}</tr>`;

    // Collect all unique staff names
    const allStaff = new Set();
    records.forEach(record => {
        const staffDetails = JSON.parse(record.staff_details || '{}');
        Object.keys(staffDetails).forEach(staffName => {
            allStaff.add(staffName);
        });
    });

    // Add staff-specific columns to the table header
    const staffNames = Array.from(allStaff);
    staffNames.forEach(staffName => {
        if (!staffName.includes('QC')) {
            const thWorkedHours = document.createElement('th');
            thWorkedHours.textContent = `${staffName} (Hours Worked)`;
            tableHead.querySelector('tr').appendChild(thWorkedHours);
        }
    });

    staffNames.forEach(staffName => {
        if (!staffName.includes('QC')) {
            const thSaveTime = document.createElement('th');
            thSaveTime.textContent = `${staffName} (Save Time)`;
            tableHead.querySelector('tr').appendChild(thSaveTime);
        }
    });

    // Populate the table rows
    records.forEach(record => {
        const row = document.createElement('tr');
        row.setAttribute('data-pn', record.PN); // Add unique identifier

        if (record.profit < 0) {
            row.style.backgroundColor = 'darkred';
            row.style.color = 'white';
        }


        // Populate static columns
        row.innerHTML = `
                    <td>
                        <button class="edit-row-btn" onclick="startEdit('${record.PN}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </td>
                    <td>${record.date || ''}</td>
                    <td>${record.PN || ''}</td>
                    <td>${record.draw_no || ''}</td>
                    <td>${record.cells || ''}</td>
                    <td>${record.customer || ''}</td>
                    <td>${record.qty || 0}</td>
                    <td>${record.av || 0}</td>
                    <td>${record.estimated_time || 0}</td>
                    <td>${record.total_time || 0}</td>
                    <td>$${record.unit_price || 0}</td>
                    <td>${record.remaining_time || 0}</td>
                    <td>${record.test_time || ''}</td>
                    <td>${record.order_no || ''}</td>
                    <td>$${record.bill_price || 0}</td>
                    <td>
                        ${(() => {
                const p = Number(record.profit || 0);
                const cls = p >= 0 ? 'positive' : 'negative';
                return `<span class="profit-badge ${cls}">$${p.toFixed(2)}</span>`;
            })()}
                    </td>

                    <td>${record.comment || ''}
                    ${record.profit <= 0 ? `<button class="add-comment-btn" onclick="showCommentDialog('${record.PN}', '${record.comment || ''}')">Add Comment</button>` : ''}</td>
                    <td>${record.stock_code || ''}</td>
                    <td class="pdf-cell">
                        ${parseInt(record.has_pdf) === 1 ?
                `<a href="${BASE_URL}/get-pdf?pn=${record.PN}" class="pdf-link" target="_blank">${record.pdf_name || 'View PDF'}</a>` :
                `<input type="file" onchange="uploadPDF('${record.PN}', this)">`
            }
                    </td>
                    <td>${record.salesman || ''}</td>
                    <td>${record.customer_code || ''}</td>
                `;

        const p = Number(record.profit || 0);
        if (p < 0) {
            row.classList.add("loss-row");
        }



        // Add staff-specific data
        const staffDetails = JSON.parse(record.staff_details || '{}');

        // Add worked hours for all staff first
        staffNames.forEach(staffName => {
            if (!staffName.includes('QC')) {
                const workedHoursCell = document.createElement('td');
                workedHoursCell.textContent = staffDetails[staffName]?.worked_hours || '';
                row.appendChild(workedHoursCell);
            }
        });

        // Add save time for all staff next
        staffNames.forEach(staffName => {
            if (!staffName.includes('QC')) {
                const saveTimeCell = document.createElement('td');
                saveTimeCell.textContent = staffDetails[staffName]?.save_time || '';
                row.appendChild(saveTimeCell);
            }
        });

        tableBody.appendChild(row);
    });
}


//Edit Table function
let currentEditRow = null;

function startEdit(pn) {
    const row = document.querySelector(`tr[data-pn="${pn}"]`);
    if (!row) return;

    currentEditRow = row;
    const cells = row.querySelectorAll('td:not(:first-child)'); // Skip the Actions column

    cells.forEach((cell, index) => {
        const value = cell.textContent.trim();
        const columnName = document.querySelector(`#testRecords thead tr th:nth-child(${index + 2})`).textContent;

        // Remove the `$` symbol for editable fields
        const cleanValue = value.startsWith('$') ? value.slice(1) : value;

        cell.innerHTML = `<input type="text" value="${cleanValue}" data-column="${columnName}">`;
    });

    const editBtn = row.querySelector('.edit-row-btn');
    editBtn.innerHTML = 'Save';
    editBtn.onclick = () => saveEdit(pn);
}

async function saveEdit(pn) {
    const row = currentEditRow;
    const inputs = row.querySelectorAll('input');
    const updates = {};

    // Gather new values
    inputs.forEach(input => {
        const colName = input.dataset.column;
        const normalizedCol = colName.replace(/\s+/g, '_').toLowerCase();
        let value = input.value.trim();
        if (value.startsWith('$')) value = value.slice(1);
        updates[normalizedCol] = value;
    });

    try {
        const response = await fetch(`${BASE_URL}/update-test-record`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pn, updates })
        });

        if (!response.ok) throw new Error("Failed to update record");
        alert("Updated successfully!");
        loadTestRecords();

        // Update the cells in the row (skip the "Actions" column)
        Object.values(updates).forEach((value, idx) => {
            // cells[0] is the "Actions" column
            row.cells[idx + 1].textContent = value;
        });

        // Restore Edit button
        const editBtn = row.querySelector('.edit-row-btn');
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
        editBtn.onclick = () => startEdit(pn);
        // *** Highlight the row ***
        row.classList.add('row-edited');


    } catch (error) {
        console.error(error);
        alert("Update failed: " + error.message);
    }
}


async function uploadPDF(pn, input) {
    const file = input.files[0];
    if (!file) {
        alert('Please select a PDF file first.');
        return;
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
        alert('Only PDF files are allowed.');
        input.value = ''; // Clear the file input
        return;
    }

    // Validate file size (5MB max)
    if (file.size > 10 * 1024 * 1024) {
        alert('PDF file too large (max 10MB allowed)');
        input.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('pn', pn);
    formData.append('file', file);

    try {
        const response = await fetch(`${BASE_URL}/upload-test-pdf`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to upload PDF');
        }

        const result = await response.json();

        // Success - dynamically update the row
        const row = document.querySelector(`tr[data-pn="${pn}"]`);
        const pdfCell = row.querySelector('.pdf-cell');
        pdfCell.innerHTML = `<a href="${BASE_URL}/get-pdf?pn=${pn}" class="pdf-link" target="_blank">${file.name}</a>`;
        alert('PDF uploaded successfully!');
    } catch (error) {
        console.error('Upload failed:', error);
        alert(`Upload failed: ${error.message}`);
        input.value = ''; // Reset on failure
    }
}

async function updateTestTime(pn, hours) {
    try {
        await fetch('/update-test-time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pn: pn,
                test_time: parseFloat(hours)
            })
        });
    } catch (error) {
        console.error('Update failed:', error);
        alert('Failed to update test time');
    }
}


// Image modal functions
function showImage(img) {
    document.getElementById('modalImage').src = img.src;
    document.getElementById('imageModal').style.display = 'block';
}

document.addEventListener("DOMContentLoaded", () => {
    const closeButtons = document.querySelectorAll(".close");
    closeButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const imageModal = document.getElementById("imageModal");
            if (imageModal) imageModal.style.display = "none";

            const commentModal = document.getElementById("commentModal");
            if (commentModal) commentModal.style.display = "none";
        });
    });
});




// Filter functionality
document.addEventListener('DOMContentLoaded', () => {
    const filterColumn = document.getElementById('filter-column');
    const filterInput = document.getElementById('filter-input');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const table = document.getElementById('testRecords');
    const tbody = table.querySelector('tbody');

    // Filter table rows based on input
    function filterTable() {
        const columnIndex = filterColumn.value === 'all' ? -1 : parseInt(filterColumn.value);
        const filterValue = filterInput.value.toLowerCase();
        const fromDate = document.getElementById('from-date').value;
        const toDate = document.getElementById('to-date').value;

        const rows = tbody.querySelectorAll('tr');

        rows.forEach(row => {
            let matchFound = false;
            const cells = row.querySelectorAll('td');
            const dateCell = cells[1].textContent; // Assuming date is in first column

            // Apply date filter first
            let dateMatch = true;
            if (fromDate || toDate) {
                const rowDate = new Date(dateCell);
                const fromDateObj = fromDate ? new Date(fromDate) : null;
                const toDateObj = toDate ? new Date(toDate) : null;

                if (fromDateObj && rowDate < fromDateObj) {
                    dateMatch = false;
                }
                if (toDateObj && rowDate > toDateObj) {
                    dateMatch = false;
                }
            }

            // Only apply text filter if date matches
            if (dateMatch) {
                if (columnIndex === -1) { // Search all columns
                    cells.forEach(cell => {
                        if (cell.textContent.toLowerCase().includes(filterValue)) {
                            matchFound = true;
                        }
                    });
                } else if (columnIndex < cells.length) { // Search specific column
                    matchFound = cells[columnIndex].textContent.toLowerCase().includes(filterValue);
                }
            }

            row.style.display = (dateMatch && matchFound) ? '' : 'none';
        });
    }


    // Clear filters
    function clearFilters() {
        filterColumn.value = 'all';
        filterInput.value = '';
        document.getElementById('from-date').value = '';
        document.getElementById('to-date').value = '';
        filterTable();
    }


    // Attach event listeners
    filterInput.addEventListener('input', filterTable);
    filterColumn.addEventListener('change', filterTable);
    clearFiltersBtn.addEventListener('click', clearFilters);
    document.getElementById('from-date').addEventListener('change', filterTable);
    document.getElementById('to-date').addEventListener('change', filterTable);
});


function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]);
}


// refresh pdf status
async function refreshPDFStatus(pn) {
    try {
        const response = await fetch(`${BASE_URL}/refresh-pdf-status?pn=${pn}`);
        if (!response.ok) throw new Error('Refresh failed');
        loadTestRecords();
    } catch (error) {
        console.error('Refresh error:', error);
        alert('Failed to refresh PDF status');
    }
}




// Comment dialog functionality
function showCommentDialog(pn, currentComment) {
    currentCommentPn = pn;
    document.getElementById('commentPn').textContent = pn;
    document.getElementById('commentText').value = currentComment || '';
    document.getElementById('commentModal').style.display = 'block';
}

function closeCommentModal() {
    document.getElementById('commentModal').style.display = 'none';
}

async function saveComment() {
    const comment = document.getElementById('commentText').value.trim();

    try {
        const response = await fetch(`${BASE_URL}/update-test-record`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pn: currentCommentPn,
                updates: { comment: comment }
            })
        });

        if (!response.ok) throw new Error("Failed to save comment");

        closeCommentModal();
        loadTestRecords(); // Refresh the table
    } catch (error) {
        console.error(error);
        alert("Failed to save comment: " + error.message);
    }
}




// Modified getFilteredData function to include date and staff filters
function getFilteredData() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const staffFilter = document.getElementById('staff-filter').value;

    const filteredRows = [];
    const allRows = document.querySelectorAll('#testRecords tbody tr');

    allRows.forEach(row => {
        const rowDate = row.querySelector('td:nth-child(1)').textContent.trim(); // Assuming date is first column
        const staffCells = row.querySelectorAll('td[data-staff]'); // Cells with staff data

        // Check date range
        const dateInRange = (!startDate || !endDate ||
            (rowDate >= startDate && rowDate <= endDate));

        // Check staff filter
        let staffMatch = !staffFilter;
        if (staffFilter) {
            staffCells.forEach(cell => {
                if (cell.textContent.includes(staffFilter)) {
                    staffMatch = true;
                }
            });
        }

        if (dateInRange && staffMatch) {
            const rowData = {};
            const cells = row.querySelectorAll('td');
            const headers = document.querySelectorAll('#testRecords thead th');

            cells.forEach((cell, index) => {
                const header = headers[index].textContent.trim();
                rowData[header] = cell.textContent.trim();
            });

            filteredRows.push(rowData);
        }
    });

    return filteredRows;
}




document.addEventListener('DOMContentLoaded', function () {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });
});


// Download report button functionality

document.addEventListener("DOMContentLoaded", () => {
    const downloadBtn = document.getElementById("download-report");
    if (downloadBtn) {
        downloadBtn.addEventListener("click", async function () {
            try {
                const fromDate = document.getElementById('from-date').value;
                const toDate = document.getElementById('to-date').value;

                if (!fromDate && !toDate) {
                    alert('Please select at least one date (From or To)');
                    return;
                }

                // Show loading indicator
                this.disabled = true;
                this.textContent = 'Generating Report...';

                // Get filtered data
                // NEW (returns JSON)
                const response = await fetch(`${BASE_URL}/api/test-records`);

                const allRecords = await response.json();

                // Filter records by date
                const filteredRecords = allRecords.filter(record => {
                    const recordDate = new Date(record.date);
                    const fromDateObj = fromDate ? new Date(fromDate) : null;
                    const toDateObj = toDate ? new Date(toDate) : null;

                    return (!fromDateObj || recordDate >= fromDateObj) &&
                        (!toDateObj || recordDate <= toDateObj);
                });

                if (filteredRecords.length === 0) {
                    alert('No records found for the selected date range');
                    return;
                }

                // Generate DOCX
                await generateDocxReport(filteredRecords, fromDate, toDate);

            } catch (error) {
                console.error('Error generating report:', error);
                alert('Failed to generate report: ' + error.message);
            } finally {
                this.disabled = false;
                this.textContent = 'Download Report (DOCX)';
            }
        });
    } else {
        console.warn("⚠️ #download-report button not found");
    }
});


async function generateDocxReport(records, fromDate, toDate) {
    const { Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, AlignmentType } = docx;

    // Calculate summary statistics
    const summary = calculateSummaryStatistics(records);
    const staffSummary = calculateStaffStatistics(records);

    // Create document
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                // Report title and metadata (same as before)
                new Paragraph({
                    text: "Production Test Records Report",
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER
                }),
                new Paragraph({
                    text: `Date Range: ${fromDate || 'Start'} to ${toDate || 'End'}`,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 }
                }),
                new Paragraph({
                    text: `Total Records: ${records.length}`,
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 100 }
                }),

                // Records table
                createRecordsTable(records),

                // Staff performance section
                new Paragraph({
                    text: "Staff Performance",
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 400, after: 200 }
                }),
                createStaffTable(staffSummary),

                // Summary statistics (same as before)
                new Paragraph({
                    text: "Summary Statistics",
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 400, after: 200 }
                }),
                createSummaryTable(summary),

                // Footer note
                new Paragraph({
                    text: "Report generated on " + new Date().toLocaleDateString(),
                    alignment: AlignmentType.RIGHT,
                    spacing: { before: 400 }
                })
            ]
        }]
    });

    // Generate and download the document
    const blob = await docx.Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Production_Test_Records_${fromDate || ''}_${toDate || ''}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


function createRecordsTable(records) {
    const { Table, TableRow, TableCell, Paragraph, TextRun, AlignmentType, WidthType, BorderStyle } = docx;

    // Add new columns to the header
    const headerTitles = [
        "Date", "PN", "Customer", "Qty", "Unit Price", "Bill Price", "StaffNames", "Remaining Time", "Profit", "Status"

    ];

    // Create table header with styling
    const headerRow = new TableRow({
        children: headerTitles.map(text =>
            new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({ text, bold: true })],
                    alignment: AlignmentType.CENTER
                })],
                shading: {
                    fill: "#00009e"
                },
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 1, color: "000000" }
                }
            })
        )
    });

    // Create table rows
    const rows = records.map(record => {
        const profit = record.profit || 0;
        const status = profit >= 0 ? "Profitable" : "Loss";
        // Get staff names except QC
        let staffNames = "";
        try {
            const staffDetails = JSON.parse(record.staff_details || '{}');
            staffNames = Object.keys(staffDetails)
                .filter(name => !name.toLowerCase().includes('qc'))
                .join('/');
        } catch (e) {
            staffNames = "";
        }

        return new TableRow({
            children: [
                new TableCell({ children: [new Paragraph(record.date || "")] }),
                new TableCell({ children: [new Paragraph(record.PN || "")] }),
                new TableCell({ children: [new Paragraph(record.customer || "")] }),
                new TableCell({ children: [new Paragraph((record.qty || 0).toString())] }),
                new TableCell({ children: [new Paragraph(`$${(record.unit_price || 0).toFixed(2)}`)] }),
                new TableCell({ children: [new Paragraph(`$${(record.bill_price || 0).toFixed(2)}`)] }),
                // New column: StaffNames
                new TableCell({ children: [new Paragraph(staffNames)] }),
                // New column: Remaining Time
                new TableCell({ children: [new Paragraph((record.remaining_time || "").toString())] }),
                new TableCell({
                    children: [new Paragraph({
                        children: [
                            new TextRun({
                                text: `$${profit.toFixed(2)}`,
                                color: profit >= 0 ? "00FF00" : "FF0000",
                                bold: true
                            })
                        ]
                    })]
                }),
                new TableCell({
                    children: [new Paragraph({
                        children: [
                            new TextRun({
                                text: status,
                                color: profit >= 0 ? "00FF00" : "FF0000",
                                bold: true
                            })
                        ]
                    })]
                })
            ]
        });
    });

    // Create the table
    return new Table({
        rows: [headerRow, ...rows],
        width: { size: 100, type: "pct" },
        columnWidths: [15, 15, 20, 10, 10, 10, 10, 10]
    });
}


function createSummaryTable(summary) {
    const { Table, TableRow, TableCell, Paragraph, TextRun, AlignmentType } = docx;

    const formatCurrency = (value) => `$${value.toFixed(2)}`;

    return new Table({
        rows: [
            // Header row
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph("Metric")] }),
                    new TableCell({ children: [new Paragraph("Value")] })
                ],
                tableHeader: true
            }),

            // Data rows
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph("Total Records")] }),
                    new TableCell({ children: [new Paragraph(summary.totalRecords.toString())] })
                ]
            }),
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph("Total Quantity")] }),
                    new TableCell({ children: [new Paragraph(summary.totalQty.toString())] })
                ]
            }),
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph("Total Profit")] }),
                    new TableCell({
                        children: [new Paragraph({
                            children: [
                                new TextRun({
                                    text: formatCurrency(summary.totalProfit),
                                    color: summary.totalProfit >= 0 ? "00FF00" : "FF0000",
                                    bold: true
                                })
                            ]
                        })]
                    })
                ]
            }),
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph("Profitable Jobs")] }),
                    new TableCell({ children: [new Paragraph(`${summary.profitableJobs} (${summary.profitPercentage}%)`)] })
                ]
            }),
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph("Loss Jobs")] }),
                    new TableCell({ children: [new Paragraph(summary.lossJobs.toString())] })
                ]
            }),

        ],
        width: { size: 50, type: "pct" },
        columnWidths: [30, 20]
    });
}



function calculateSummaryStatistics(records) {
    const totalQty = records.reduce((sum, record) => sum + (record.qty || 0), 0);
    const totalProfit = records.reduce((sum, record) => sum + (record.profit || 0), 0);
    const avgProfit = totalProfit / records.length;
    const profitableJobs = records.filter(r => (r.profit || 0) >= 0).length;
    const lossJobs = records.length - profitableJobs;

    return {
        totalRecords: records.length,
        totalQty,
        totalProfit,
        profitableJobs,
        lossJobs,
        profitPercentage: (profitableJobs / records.length * 100).toFixed(1)
    };
}

function calculateStaffStatistics(records) {
    const staffMap = new Map();

    // Process all records to aggregate staff data
    records.forEach(record => {
        try {
            const staffDetails = JSON.parse(record.staff_details || '{}');

            Object.entries(staffDetails).forEach(([staffName, details]) => {
                if (!staffMap.has(staffName)) {
                    staffMap.set(staffName, {
                        totalHours: 0,
                        totalSaveTime: 0,
                        jobsWorked: 0
                    });
                }

                const staffData = staffMap.get(staffName);
                staffData.totalHours += parseFloat(details.worked_hours) || 0;
                staffData.totalSaveTime += parseFloat(details.save_time) || 0;
                staffData.jobsWorked += 1;
            });
        } catch (e) {
            console.error('Error parsing staff details:', e);
        }
    });

    // Convert to array and calculate averages
    return Array.from(staffMap.entries()).map(([name, data]) => ({
        name,
        totalHours: data.totalHours,
        totalSaveTime: data.totalSaveTime,
        avgHoursPerJob: data.totalHours / data.jobsWorked,
        avgSaveTimePerJob: data.totalSaveTime / data.jobsWorked,
        jobsWorked: data.jobsWorked
    })).sort((a, b) => b.totalHours - a.totalHours); // Sort by most hours worked
}

function createStaffTable(staffData) {
    const { Table, TableRow, TableCell, Paragraph, TextRun } = docx;

    return new Table({
        rows: [
            // Header row
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph("Staff Name")] }),
                    new TableCell({ children: [new Paragraph("Total Hours")] }),
                    new TableCell({ children: [new Paragraph("Total Save Time")] }),
                    new TableCell({ children: [new Paragraph("Avg Hours/Job")] }),
                    new TableCell({ children: [new Paragraph("Avg Save Time/Job")] }),
                    new TableCell({ children: [new Paragraph("Jobs Worked")] })
                ],
                tableHeader: true
            }),

            // Data rows
            ...staffData.map(staff => (
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph(staff.name)] }),
                        new TableCell({ children: [new Paragraph(staff.totalHours.toFixed(2))] }),
                        new TableCell({ children: [new Paragraph(staff.totalSaveTime.toFixed(2))] }),
                        new TableCell({ children: [new Paragraph(staff.avgHoursPerJob.toFixed(2))] }),
                        new TableCell({ children: [new Paragraph(staff.avgSaveTimePerJob.toFixed(2))] }),
                        new TableCell({ children: [new Paragraph(staff.jobsWorked.toString())] })
                    ]
                })
            )),

            // Footer row with totals
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph("TOTAL")] }),
                    new TableCell({
                        children: [new Paragraph(
                            staffData.reduce((sum, s) => sum + s.totalHours, 0).toFixed(2)
                        )]
                    }),
                    new TableCell({
                        children: [new Paragraph(
                            staffData.reduce((sum, s) => sum + s.totalSaveTime, 0).toFixed(2)
                        )]
                    }),
                    new TableCell({ children: [new Paragraph("")] }),
                    new TableCell({ children: [new Paragraph("")] }),
                    new TableCell({
                        children: [new Paragraph(
                            staffData.reduce((sum, s) => sum + s.jobsWorked, 0).toString()

                        )]
                    })
                ]
            })
        ],
        width: { size: 100, type: "pct" },
        columnWidths: [20, 15, 15, 15, 15, 15]
    });
}
