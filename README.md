# CoalLIMS — Coal Testing Laboratory Information Management System

A full-stack web application for managing coal sample testing workflows.  
Built with **React + Vite + Tailwind** (frontend) and **Node.js + Express + Neon PostgreSQL** (backend).

---

## Project Structure

```
coal-lims/
├── backend/               # Express API
│   ├── src/
│   │   ├── db/
│   │   │   ├── client.js  # Neon DB connection
│   │   │   └── setup.js   # DB schema + seed script
│   │   ├── middleware/
│   │   │   └── auth.js    # JWT auth + role middleware
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── clients.js
│   │   │   ├── sampleGroups.js
│   │   │   ├── samples.js
│   │   │   ├── tests.js
│   │   │   ├── testDefinitions.js
│   │   │   └── reports.js
│   │   └── index.js       # Express entry point
│   ├── .env.example
│   └── package.json
│
└── frontend/              # React SPA
    ├── src/
    │   ├── components/
    │   │   └── shared/
    │   │       ├── UI.jsx       # Reusable UI components
    │   │       ├── Sidebar.jsx
    │   │       └── AppShell.jsx
    │   ├── contexts/
    │   │   └── AuthContext.jsx
    │   ├── lib/
    │   │   ├── api.js           # All API calls
    │   │   └── pdf.js           # PDF generation
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── UsersPage.jsx          # Super Admin
    │   │   ├── ClientsPage.jsx        # Super Admin
    │   │   ├── SampleGroupsPage.jsx   # Admin + Lab Manager
    │   │   ├── SampleGroupDetailPage.jsx
    │   │   ├── MyTestsPage.jsx        # Chemist
    │   │   ├── ReviewTestsPage.jsx    # Lab Manager
    │   │   └── ReportsPage.jsx        # Admin
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## Roles

| Role         | Capabilities |
|--------------|-------------|
| `super_admin` | Create users (admin, lab_manager, chemist), manage clients |
| `admin`       | Register sample groups with samples, download PDF reports |
| `lab_manager` | Assign lab IDs, assign tests to chemists, approve/reject results |
| `chemist`     | View assigned tests, submit results |

---

## Workflow

```
Admin registers sample group + samples
        ↓
Lab Manager assigns internal lab IDs
        ↓
Lab Manager assigns test(s) → chemist
        ↓
Chemist fills result value → submits
        ↓
Lab Manager reviews → Approves or Rejects
        ↓  (if rejected → chemist resubmits)
Admin downloads PDF report
```

---

## Setup

### 1. Neon Database

1. Create a free project at [neon.tech](https://neon.tech)
2. Copy the connection string

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — paste your DATABASE_URL and set JWT_SECRET
npm install
npm run db:setup      # Creates tables + seeds super admin + 20 tests
npm run dev           # Starts API on http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev           # Starts on http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:4000` automatically.

---

## Default Credentials

| Role        | Email                       | Password        |
|-------------|----------------------------|-----------------|
| Super Admin | superadmin@coallims.com    | SuperAdmin@123  |

> Create other users via the **Users** page after logging in as Super Admin.

---

## API Endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/users` | super_admin, lab_manager | List users |
| POST | `/api/users` | super_admin | Create user |
| GET | `/api/clients` | All | List clients |
| POST | `/api/clients` | super_admin | Create client |
| GET | `/api/sample-groups` | All | List groups |
| POST | `/api/sample-groups` | admin | Create group + samples |
| PATCH | `/api/samples/:id/lab-id` | lab_manager | Assign lab ID |
| POST | `/api/samples/:id/tests` | lab_manager | Assign test |
| GET | `/api/tests` | chemist, lab_manager, admin | List tests |
| PATCH | `/api/tests/:id/submit` | chemist | Submit result |
| PATCH | `/api/tests/:id/review` | lab_manager | Approve/reject |
| GET | `/api/reports/test/:id` | admin | Single test report data |
| GET | `/api/reports/group/:id` | admin | Group report data |
| GET | `/api/test-definitions` | All | 20 predefined test types |

---

## Production Deployment

### Backend (e.g. Railway / Render)
- Set `DATABASE_URL`, `JWT_SECRET`, `PORT`
- Set `FRONTEND_URL` to your frontend domain for CORS

### Frontend (e.g. Vercel / Netlify)
- Set `VITE_API_URL` if not using same domain
- Update `vite.config.js` proxy or use absolute API URL in `src/lib/api.js`
