1. User Roles
Citizen:
View constituency summaries
View flagged anomalies
Submit feedback

Admin:
Upload documents
Trigger ingestion
Approve or reject flagged issues
Manage constituency/project data

2. Functional Requirements
2.1 Document Upload
Admin can upload PDF/image files.
Backend validates file type.
The system stores the uploaded file and sends the job to the worker.

2.2 Data Ingestion
Extract text from PDFs/images.
Perform OCR if the document is scanned.
Detect and extract key fields (project name, cost, status).

2.3 AI Summaries
Generate constituency-level summaries.
Provide project-level explanations in simple English/Swahili.

2.4 Anomaly Detection
Detect unusually high costs.
Compare category spending across years.
Flag missing data or inconsistent entries.

2.5 Dashboard
Display national map with color-coded scores.
Constituency overview page.
Project list filtered by flags.

2.6 Feedback System
Citizens submit comments.
Admin reviews and marks as resolved.
