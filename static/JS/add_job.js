 function highlightField(id) {
      const el = document.getElementById(id);
      if (!el) return;

      el.classList.add('highlighted');

      // Remove the class after animation ends so it can be triggered again later
      setTimeout(() => {
        el.classList.remove('highlighted');
      }, 1500);
    }


    // Function to fetch all related data by Drawing Number

    // Function to auto-fill CDraw from DrawingNo
    function autoFillCDraw() {
      var drawingNoValue = document.getElementById("draw-no").value;
      document.getElementById("CDraw").value = drawingNoValue;  // Set CDraw value to DrawingNo
      highlightField("CDraw");
    }

    // Function to auto-fill CCells from BatteryName
    function autoFillCCells() {
      var batteryName = document.getElementById("no-cell").value;
      document.getElementById("CCells").value = batteryName;
      highlightField("CCells");
    }

    // Function to auto-fill C-AV from AV
    function autoFillCav() {
      var cavValue = document.getElementById("av").value;
      document.getElementById("Cav").value = cavValue;
      highlightField("Cav");
    }

    // Function to auto-fill C-B$ from B$
    function autoFillCB$() {
      var bDollar = document.getElementById("b-price").value;
      document.getElementById("CB$").value = bDollar;
      highlightField("CB$");
    }

    // Function to auto-fill C-S$ from S$
    function autoFillCS$() {
      var sDollar = document.getElementById("s-price").value;
      document.getElementById("CS$").value = sDollar;
      highlightField("CS$");
    }

    // Function to auto-fill StockCode
    function autoFillStockCode() {
      var stockCode = document.getElementById('stock-code').value;
      document.getElementById('CSTcode').value = stockCode;
      highlightField("CSTcode");
    }


    // Function to get current input date
    window.onload = function () {
      var today = new Date();
      var dd = today.getDate();
      var mm = today.getMonth() + 1; // January is 0!
      var yyyy = today.getFullYear();

      // Format the date to YYYY-MM-DD
      if (dd < 10) {
        dd = '0' + dd;
      }
      if (mm < 10) {
        mm = '0' + mm;
      }

      today = yyyy + '-' + mm + '-' + dd;

      // Set the value of the input to today's date
      document.getElementById("inputDate").value = today;
    };

    // Function to calculate WH (Watt-Hours)
    function calculateWH() {
      // Get the values of Volts and Ah
      var volts = parseFloat(document.getElementById("Volts").value);
      var ah = parseFloat(document.getElementById("ah").value);

      // Calculate WH (Volts * Ah)
      if (!isNaN(volts) && !isNaN(ah)) {
        var wh = volts * ah;  // Multiply Volts and Ah
        document.getElementById("wh").value = wh.toFixed(2);  // Display result in the WH input field
      } else {
        document.getElementById("wh").value = "";  // Clear WH if inputs are invalid
      }
    }

    document.addEventListener('DOMContentLoaded', function () {
      document.querySelector("form").addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
        }
      });
      document.getElementById('jobForm').addEventListener('submit', async function (e) {
        e.preventDefault();





        const formData = {
          pn: document.getElementById('pn').value,
          noCell: document.getElementById('no-cell').value,
          drawNo: document.getElementById('draw-no').value,
          reqDate: document.getElementById('requ-date').value,
          cust: document.getElementById('cust').value,
          stockCode: document.getElementById('stock-code').value,
          qty: parseFloat(document.getElementById('qty').value),
          cellCode: document.getElementById('cell-code').value,
          bPrice: parseFloat(document.getElementById('b-price').value),
          orderNo: document.getElementById('order-no').value,
          model: document.getElementById('model').value,
          vol: parseFloat(document.getElementById('Volts').value),
          ah: parseFloat(document.getElementById('ah').value),
          wh: parseFloat(document.getElementById('wh').value),
          chem: document.getElementById('chem').value,
          structure: document.getElementById('structure').value,
          staff: document.getElementById('staff').value,
          workhr: parseFloat(document.getElementById('workhr').value),
          HRPP: parseFloat(document.getElementById('HRPP').value),
          endDate: document.getElementById('endDate').value,
          testTime: parseFloat(document.getElementById('testTime').value),
          av: parseFloat(document.getElementById('av').value),
          sPrice: parseFloat(document.getElementById('s-price').value),
          discount: parseFloat(document.getElementById('discount').value),
          salesman: document.getElementById('salesman').value,
          customerCode: document.getElementById('customer-code').value,
          orderDate: document.getElementById('orderDate').value
        };

        formData.excludeSaveTime = document.getElementById('excludeSaveTime').checked;


        try {
          const response = await fetch(`${backendBaseUrl}/add_job`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });

          const data = await response.json();

          if (response.ok) {
            alert(data.message || 'Job added successfully.');
            document.getElementById('jobForm').reset();
            clearGreenHighlights();
          } else {
            alert(data.error || 'An error occurred while adding the job.');
          }
        } catch (error) {
          console.error('Error submitting the form:', error);
          alert('An error occurred while submitting the form. Please try again.');
        }
      });


      function fetchByDrawingNumber(drawingNo) {
        fetch(`${backendBaseUrl}/get-job-data-by-drawing?Drawing_Number=${encodeURIComponent(drawingNo)}`)
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              if (data.csvData.AVERAGE_TIME) {
                document.getElementById('av').value = data.csvData.AVERAGE_TIME.toFixed(2);
                highlightGreenField('av');
                autoFillCav();
              }
              if (data.csvData.B_PRICE) {
                document.getElementById('b-price').value = data.csvData.B_PRICE;
                highlightGreenField('b-price');
                autoFillCB$();
              }
              if (data.csvData.S_PRICE) {
                document.getElementById('s-price').value = data.csvData.S_PRICE;
                highlightGreenField('s-price');
                autoFillCS$();
              }

              if (data.stockCode) {
                document.getElementById('stock-code').value = data.stockCode;
                highlightGreenField('stock-code');
                autoFillStockCode();
              }

              if (data.cellsParts) {
                document.getElementById('no-cell').value = data.cellsParts;
                highlightGreenField('no-cell');
                autoFillStockCode();
              }

              if (data.model) {
                document.getElementById('model').value = data.model;
                highlightGreenField('model');
                autoFillStockCode();
              }

              // Show fetch confirmation message
              const msg = document.getElementById('draw-fetch-msg');
              msg.style.display = 'block';
              setTimeout(() => { msg.style.display = 'none'; }, 3000);
            }
          })
          .catch(error => console.error('Error fetching by Drawing Number:', error));
      }


      function highlightGreenField(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.add('highlighted-green');
      }

      function clearGreenHighlights() {
        document.querySelectorAll('.highlighted-green').forEach(el => {
          el.classList.remove('highlighted-green');
        });
      }

      // Add event listener
      document.getElementById('draw-no').addEventListener('input', function (e) {
        if (e.target.value.length > 3) {
          fetchByDrawingNumber(e.target.value);
        }
      });


      document.getElementById('pn').addEventListener('change', function () {
        const scannedJobId = this.value.trim();
        if (scannedJobId) {
          console.log("🎯 Scanned JobID:", scannedJobId);

          // ✅ Show a confirmation message below
          const msg = document.getElementById('scanMessage');
          msg.textContent = "Scanned JobID: " + scannedJobId;
          msg.style.color = "green";
        }
      });

    });