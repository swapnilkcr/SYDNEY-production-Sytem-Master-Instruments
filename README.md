# Sydney Production System – Master Instruments  

**An all-in-one production tracking system with staff clock-in/out, job allocation, time tracking, and reporting.**  

## ✨ Features
- Staff clock-in / clock-out with task tracking  
- Job allocation and monitoring (not started, in progress, finished)  
- Estimated vs. actual time with remaining hours  
- Labor cost & profit calculation  
- PDF upload for test records  
- Export reports to Excel and PDF  

## 🛠️ Tech Stack
- **Backend:** Python (http.server, SQLite3, Pandas, ReportLab, OpenPyXL, Jinja2)  
- **Frontend:** HTML, CSS, JavaScript  
- **Database:** SQLite3  

## 🚀 Setup
```bash
git clone https://github.com/swapnilkcr/SYDNEY-production-Sytem-Master-Instruments.git
cd SYDNEY-production-Sytem-Master-Instruments/app
pip install pandas openpyxl reportlab jinja2 bcrypt websockets
python backend.py


Development Workflow
develop → Test environment
main → Production environment
