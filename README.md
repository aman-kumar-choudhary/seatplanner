# Seat Management & Student Attendance Planner

A full-stack, enterprise-grade web application for visual student seating arrangements and session-based attendance management.

## 🎯 Key Capabilities & Architecture

- **Visual Theater-Style Seating Planner**: Configurable seating sections, dynamic row/column grids, horizontal and vertical orientation toggles, auto seat numbering.
- **Strict Public Privacy**: Public visual seat map allowing students to find and highlight their seats by name/roll number **without exposing sensitive student records or attendance data**. Clicking seats on the public interface does not reveal student info.
- **Admin Seating Management**: Manual assignment, atomic seat reassignment, seat swapping, and release controls with double-assignment prevention.
- **Session-Based Attendance**: Independent attendance sessions (lectures, exams, workshops) with real-time seat map synchronization, present/absent/not-marked tracking, and bulk actions.
- **Student Roster Management**: Full CRUD, flexible filtering, duplicate validation, and CSV / Excel bulk import and export.
- **Attendance Analytics & Exports**: Live filtering by session, date, department, course, section, and status with direct CSV and Excel (`.xlsx`) downloads.
- **Immutable Audit Trail**: Append-only administrative activity logs tracking seating changes, attendance marks, and imports with previous/new state inspection.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, Lucide React, Axios, React Router v7, React Hot Toast, PapaParse, XLSX |
| **Backend** | Python 3.12, FastAPI, Pydantic v2, Motor (Async MongoDB), PyJWT, Bcrypt, SlowAPI, OpenPyXL |
| **Database** | MongoDB 8 with indexed collections & referential consistency |

---

## 🚀 Quick Start & Running Locally

### 1. Prerequisites
- MongoDB running on `localhost:27017`
- Conda environment `live` (Python 3.12)
- Node.js (v20+) & npm

### 2. Backend Setup
```bash
# Activate conda environment
conda activate live

# Change to backend directory
cd backend

# Populate initial admin and sample institutional data
python seed.py

# Run FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation (Swagger UI) is available at: `http://127.0.0.1:8000/docs`

### 3. Frontend Setup
```bash
# In a new terminal, navigate to frontend
cd frontend

# Install dependencies (already installed)
npm install

# Start Vite development server
npm run dev -- --port 3000
```
Open your browser at: `http://127.0.0.1:3000`

---

## 🔐 Default Credentials

| Role | Username | Password | Access |
|---|---|---|---|
| **Administrator** | `admin` | `admin123` | Full administrative console at `/admin/login` |
| **Public User** | None | None | Public visual seat chart & search at `/` |

---

## 🧪 Running Backend Automated Tests

```bash
conda activate live
cd backend
python -m pytest tests/ -v
```

All 6 test suites verify:
1. API Health & Readiness
2. Public Seating Privacy enforcement (ensures zero student personal info is leaked)
3. Public Student Search Locator (ensures only minimal seat coordinates are exposed)
4. Admin Authentication, JWT validation, and 401/403 protection
5. Critical Seating Business Rules (single student per seat, single seat per student)
6. Session-based attendance marking and percentage calculation

---

## 📂 Project Structure

```
seatplanner/
├── backend/
│   ├── app/
│   │   ├── config.py             # Settings and environment variables
│   │   ├── database.py           # Async Motor connection & index setup
│   │   ├── main.py               # FastAPI entry point & CORS
│   │   ├── middleware/           # SlowAPI rate limiter
│   │   ├── models/               # MongoDB models
│   │   ├── routers/              # 9 dedicated REST API routers
│   │   ├── schemas/              # Pydantic validation schemas
│   │   ├── services/             # Business logic & audit trail
│   │   └── utils/                # Password hashing, JWT, helpers
│   ├── seed.py                   # Realistic sample data seeder
│   └── tests/                    # Pytest async test suite
│
├── frontend/
│   ├── src/
│   │   ├── components/           # Reusable UI & Modal components
│   │   │   ├── SeatMap/          # Interactive theater grid & seat tiles
│   │   │   └── StudentSearch.jsx # Debounced locator search
│   │   ├── context/              # AuthContext & token management
│   │   ├── pages/                # 10 full-featured application pages
│   │   └── services/             # Axios API service modules
│   ├── vite.config.js            # Vite config with API proxy
│   └── package.json
```
