const BACKEND_IP = "10.0.0.80";
const backendBaseUrl = "http://10.0.0.80:4003";

function searchCSVData() {
    const Drawing_Number = document.getElementById('drawing-number').value.trim();

    if (!Drawing_Number) {
        alert('Please enter a Drawing Number to search.');
        return;
    }

    console.log(`🔍 Searching for Drawing Number: ${Drawing_Number}`);  // Debugging


    // Show loading spinner
    const loading = document.getElementById('loading');
    const container = document.getElementById('csv-data-container');
    const errorMsg = document.getElementById('error-message');

    loading.style.display = 'block'; // Show spinner
    container.style.display = 'none'; // Hide table
    errorMsg.textContent = ''; // Clear previous error

    // Fetch CSV data
    fetchCSVData(Drawing_Number);
}

async function fetchCSVData(Drawing_Number = null) {
    const container = document.getElementById('csv-data-container');
    const loading = document.getElementById('loading');
    const errorMsg = document.getElementById('error-message');

    try {
        const url = `${backendBaseUrl}/get-csv-data?Drawing_Number=${encodeURIComponent(Drawing_Number)}`;
        console.log(`🌐 Fetching from: ${url}`);

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        // Hide loading spinner
        loading.style.display = 'none';

        if (data.csvData && data.csvData.length > 0) {
            const table = document.createElement('table');
            table.className = 'csv-data-table';

            // Create table header
            const headers = Object.keys(data.csvData[0]);
            const headerRow = document.createElement('tr');

            headers.forEach(header => {
                const th = document.createElement('th');
                th.textContent = header;

                // Add class to "Total_av" column
                if (header.toLowerCase() === "current_av") {
                    th.classList.add("current_av");
                } else if (header.toLowerCase() === "average_time") {
                    th.classList.add("average_time");
                }

                headerRow.appendChild(th);
            });

            const thead = document.createElement('thead');
            thead.appendChild(headerRow);
            table.appendChild(thead);

            // Populate table body
            const tbody = document.createElement('tbody');
            let isFirstRow = true; // Flag to check the first row for Total_av

            data.csvData.forEach(row => {
                const tr = document.createElement('tr');
                headers.forEach(header => {
                    const td = document.createElement('td');

                    let value = row[header] || ' ';

                    // Format specific columns to 2 decimal places
                    if (["USED_TIME", "CURRENT_AV", "AVERAGE_TIME", "TOTAL_AV"].includes(header.toUpperCase())) {
                        const numericValue = parseFloat(value);
                        if (!isNaN(numericValue)) {
                            value = numericValue.toFixed(2); // Convert to number and format
                        } else {
                            value = ''; // Leave blank if the value is not a valid number
                        }
                    }

                    // Set value for Total_av only in the first row, leave other rows blank
                    if (header.toUpperCase() === "TOTAL_AV" && !isFirstRow) {
                        value = ''; // Leave blank for all other rows
                    }

                    td.textContent = value;
                    td.classList.add(`col-${header.toLowerCase().replace(/\s+/g, "_")}`);
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });


            table.appendChild(tbody);

            container.innerHTML = ''; // Clear previous content
            container.appendChild(table);
            container.style.display = 'block'; // Show the table

            // Call function to add tooltip after rendering the table
            addTooltipsToHeaders();
        } else {
            container.innerHTML = '<p>No data found for the specified file name.</p>';
            container.style.display = 'block';
        }
    } catch (error) {
        loading.style.display = 'none';
        errorMsg.textContent = `Error loading data: ${error.message}`;
        console.error('Fetch error:', error);
    }
}

function addTooltipsToHeaders() {
    const tooltipInfo = {
        "current_av": "Current_av = USED TIME / QUANTITY",
        "average_time": "Average_time = SUM(USED TIME) / SUM(QUANTITY)"
    };

    Object.keys(tooltipInfo).forEach(className => {
        const header = document.querySelector(`.${className}`);

        if (header) {
           // header.style.position = "relative"; // Needed for tooltip positioning

            header.addEventListener("mouseenter", function () {
                let tooltip = document.createElement("div");
                tooltip.className = "tooltip-box";
                tooltip.textContent = tooltipInfo[className]; // Get tooltip text

                document.body.appendChild(tooltip);

                // Positioning the tooltip
                let rect = header.getBoundingClientRect();
                tooltip.style.top = `${rect.bottom + window.scrollY}px`;
                tooltip.style.left = `${rect.left + window.scrollX}px`;
            });

            header.addEventListener("mouseleave", function () {
                document.querySelectorAll(".tooltip-box").forEach(tooltip => tooltip.remove());
            });
        }
    });
}



document.addEventListener("DOMContentLoaded", () => {
    const clearBtn = document.getElementById("clear-filters");
    if (clearBtn) {
        clearBtn.addEventListener("click", clearFilters);
    }

    function clearFilters() {
        document.getElementById("drawing-number").value = "";
        window.location.reload();
    }
});
