# AI-Powered CSV Importer — GrowEasy (Vercel Build)

This repository contains the submission for the **Software Developer (Intern / Full-Time)** assignment for GrowEasy. 

It is an AI-powered CRM Lead CSV Importer that allows users to upload spreadsheets of **any** layout, column structure, or format (e.g. Facebook Exports, Google Ads Exports, real estate sheets, or manually created files) and maps them into standard GrowEasy CRM records using Google Gemini AI.

---

## Technical Architecture

The project is structured as a monorepo consisting of:
1. **Frontend (Next.js)**: Built using Next.js App Router, TypeScript, and **Vanilla CSS** for a custom, glassmorphic dark mode dashboard. Parses files client-side using `PapaParse` and imports records in rate-limit-aware batches with progress tracking.
2. **Backend (Node.js + Express)**: Built with Express, TypeScript, and native ESM. Integrates official Google Gemini API (with optional OpenAI fallback) using strict JSON schemas to guarantee type and enum compliance.

---

## Features Implemented

*   **Drag & Drop & File Picker**: Intuitive, interactive drop zone matching the GrowEasy screenshots.
*   **Locally Parsed Preview**: Instant spreadsheet preview inside a highly optimized responsive table supporting vertical & horizontal scroll, row counts, and sticky headers before any AI processing is called.
*   **AI-Powered Column Mapping**: Maps custom layouts (e.g. "Full Client Name" -> `name`, "Mail Address" -> `email`, "Contact Number" -> `mobile_without_country_code`).
*   **Progressive Batch Streaming & Resilient Retries**: Frontend slices raw CSV data into batches of 25, sending requests sequentially. Includes interactive progress spinner, percentage loaded bar, and a retry mechanism (up to 3 times per batch with exponential backoff) for maximum reliability against rate limits.
*   **Validation & Skip Logic**: Clean post-processing filtering. If a record has neither email nor mobile number (after AI mapping), it is automatically skipped. Date formats are cleaned into JS-parseable ISO values.
*   **Dual Mapped/Skipped Leads Tabs**: Mapped leads go to the main CRM table. Skipped leads are placed in a secondary audit tab with the exact reason for skipping (e.g., "missing both email and mobile number").
*   **Sample Templates**: Downloadable **Standard CRM Template** and a **Messy CSV Template** built-in for instant testing.
*   **Unit Tests**: Backend unit testing via `Vitest` validating the custom CSV parser engine.
*   **Dark Mode Aesthetics**: Sleek dark mode styling matching GrowEasy dashboard colors.

---

## Getting Started

### Prerequisites
*   Node.js (version 18+ or 22+ recommended)
*   npm

### 1. Clone & Set Up Backend

Navigate to the `backend` folder:
```bash
cd backend
```

Install dependencies:
```bash
npm install
```

Create a `.env` file (copied from `.env.example`):
```bash
cp .env.example .env
```
Open `.env` and fill in your Gemini API key (or OpenAI key):
```env
PORT=5000
GEMINI_API_KEY=your_google_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
# Optional OpenAI configuration fallback
OPENAI_API_KEY=
```

Start the backend development server:
```bash
npm run dev
```
The server will boot on `http://localhost:5000`.

### 2. Set Up Frontend

Open a new terminal and navigate to the `frontend` folder:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Start the Next.js development server:
```bash
npm run dev
```
The frontend application will be running on `http://localhost:3000`.

---

## Running with Docker

You can run both the frontend and backend together using Docker and Docker Compose.

1. Ensure you have Docker and Docker Compose installed.
2. Run the following command from the root directory:
   ```bash
   docker-compose up --build
   ```
3. The frontend will be available at `http://localhost:3000` and the backend API at `http://localhost:5000`.

---

## Running Tests

To execute the backend unit tests (checking CSV parsing functionality and edge cases):
```bash
cd backend
npm run test
```

---

## GrowEasy CRM Schema Fields

The AI model maps input fields to the following fields:
*   `created_at`: Lead creation date
*   `name`: Lead name
*   `email`: Primary email (first email found, others appended to note)
*   `country_code`: Calling code (e.g., `+91`)
*   `mobile_without_country_code`: Primary mobile number
*   `company`: Company name
*   `city`: City
*   `state`: State
*   `country`: Country
*   `lead_owner`: Owner/Agent identifier
*   `crm_status`: One of `GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, `SALE_DONE`
*   `crm_note`: Remarks, unmapped fields, and extra emails/phones
*   `data_source`: One of `leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`, `sarjapur_plots` or blank
*   `possession_time`: Property possession time
*   `description`: Lead description