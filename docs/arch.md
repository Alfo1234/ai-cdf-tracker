The AI-Powered CDF Tracker ingests CDF documents and public data, turns them into structured records, runs AI to summarize and flag suspicious items, and shows the results on a simple web dashboard for citizens and auditors.

Core components

Data Sources

Where information comes from: NG-CDF portal, Auditor-General PDFs, county reports, news, and citizen uploads (photos, feedback).

Think of this as the “raw ingredients” cupboard.

Data Ingestion (data_pipeline/)

Scripts that fetch or accept files, then convert them into text/tables.

Tools: web scrapers for HTML pages, PDF → text using OCR for scans.

Purpose: turn messy documents into neat spreadsheet-like rows.

Storage (database/)

A place to keep clean, structured data (tables: constituencies, projects, transactions, feedback).

Think of this as a neatly organized filing cabinet.

ML/AI Engine (ml_engine/)

Runs models that:

Summarize reports into plain English/Swahili (NLP).

Detect suspicious spending (anomaly detection).

Compute the Public Accountability Score (PAS).

This is the “smart brain.”

Backend API (backend/)

A small web server that:

Provides endpoints for the frontend to request data and AI results.

Accepts uploads (e.g., PDF from admin or citizen).

Triggers the ingestion & AI jobs.

Think of the backend as the waiter who brings data to the frontend.

Frontend Dashboard (frontend/)

The web pages people use:

National map with transparency colors.

Constituency page with projects, AI summary, and flags.

Admin upload page.

This is the user-friendly face of the system.

Worker / Background Jobs (simple)

Handles heavy tasks (OCR, long AI runs) so the site doesn’t freeze.

Example: user uploads a PDF → worker processes it and saves results.

Security & Logging

Simple measures: API keys, HTTPS, and logs of changes.

Ensures trust and auditability.
