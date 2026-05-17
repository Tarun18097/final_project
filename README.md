# 🛡️ API Security Testing & Abuse Detection Platform

> **MCA Cybersecurity Internship Project — UPES Dehradun**
> Team: Tarun Kukreti · Om Uniyal · Shivam Sharma
> Industry Mentor: Mr. Yogesh Kumar (IBM) | UPES Mentor: Ms. Gaytri Bakshi

---

## ✨ Features

- **Real-time API Traffic Monitoring** — ingest logs via REST endpoint, view live in dashboard
- **Anomaly Detection Engine** — rate limiting, brute-force detection, injection pattern matching
- **Vulnerability Test Engine** — OWASP API Top 10 tests: SQL injection, XSS, auth bypass, rate limit enforcement, security headers
- **Live Alerts via WebSocket** — Socket.IO pushes alerts to dashboard instantly
- **JWT Authentication** — login-protected dashboard with admin/viewer roles
- **Traffic Simulator** — built-in scenarios to trigger real alerts for demo
- **MongoDB persistence** — all logs, alerts, and test results stored permanently
- **Docker Compose** — one command to run the full stack

---

## 🚀 Quick Start (Docker — Recommended)

```bash
# 1. Clone the repo
git clone https://github.com/Tarun18097/api-security-platform.git
cd api-security-platform

# 2. Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Start everything
docker-compose up --build

# 4. Open http://localhost:3000
# Login: admin / admin123
```

---

## 💻 Local Development (No Docker)

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongod`)

### Backend
```bash
cd backend
cp .env.example .env          # edit JWT_SECRET!
npm install
node src/app.js
# Runs on http://localhost:4000
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
# Runs on http://localhost:3000
```

---

## 📡 API Reference

All endpoints (except `/api/auth/*` and `/health`) require:
```
Authorization: Bearer <jwt_token>
```

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login → returns JWT |
| POST | `/api/auth/register` | Create new user |
| POST | `/api/logs/ingest` | Ingest an API log entry |
| GET | `/api/logs` | Get paginated logs |
| GET | `/api/logs/stats` | Get traffic statistics |
| GET | `/api/logs/timeline` | Get per-minute timeline (last 30 min) |
| GET | `/api/alerts` | Get all alerts |
| PATCH | `/api/alerts/:id/resolve` | Mark alert as resolved |
| DELETE | `/api/alerts/resolved` | Clear all resolved alerts |
| POST | `/api/tests/run` | Run vulnerability tests against a URL |
| GET | `/api/tests/results` | Get test result history |
| GET | `/health` | Health check |

### Ingest a log (example)
```bash
curl -X POST http://localhost:4000/api/logs/ingest \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ip_address": "192.168.1.100",
    "method": "GET",
    "endpoint": "/api/users",
    "status_code": 200,
    "response_time_ms": 145,
    "user_agent": "Mozilla/5.0"
  }'
```

### Run vulnerability tests (example)
```bash
curl -X POST http://localhost:4000/api/tests/run \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target_url": "https://your-api.com/api/users",
    "tests": ["SQL_INJECTION", "AUTH_BYPASS", "SECURITY_HEADERS"]
  }'
```

---

## 🔧 Environment Variables

### Backend (`backend/.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Server port |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/api_security` | MongoDB connection |
| `JWT_SECRET` | *(required)* | Secret for JWT signing — **change this!** |
| `JWT_EXPIRY` | `24h` | Token expiry |
| `ADMIN_PASSWORD` | `admin123` | Default admin password |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed CORS origin |
| `RATE_LIMIT_THRESHOLD` | `30` | Requests/min before alert |
| `BRUTE_FORCE_THRESHOLD` | `5` | Consecutive 401s before alert |

### Frontend (`frontend/.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:4000/api` | Backend API URL |
| `VITE_SOCKET_URL` | `http://localhost:4000` | Socket.IO server URL |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, Recharts, Socket.IO Client, Vite |
| Backend | Node.js, Express.js, Socket.IO |
| Database | MongoDB, Mongoose ODM |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Security | Helmet, express-rate-limit |
| DevOps | Docker, Docker Compose, Nginx |

---

## 📁 Project Structure

```
api-security-platform/
├── backend/
│   ├── src/
│   │   ├── app.js              # Main server entry point
│   │   ├── models/             # MongoDB models (Log, Alert, TestResult, User)
│   │   ├── routes/             # REST API routes
│   │   ├── engines/            # Anomaly detection + Vuln test engine
│   │   └── middleware/         # JWT auth middleware
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main app with auth + socket
│   │   ├── api/api.js          # API client
│   │   ├── hooks/useSocket.js  # Socket.IO hook
│   │   └── components/         # All UI components
│   ├── .env.example
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## ⚠️ Production Checklist

- [ ] Change `JWT_SECRET` to a long random string
- [ ] Change `ADMIN_PASSWORD` from default `admin123`
- [ ] Set `FRONTEND_URL` to your actual domain
- [ ] Use MongoDB Atlas or a secured MongoDB instance
- [ ] Enable HTTPS on your server/reverse proxy
- [ ] Set `NODE_ENV=production`

---

*UPES MCA Cybersecurity · April 2026*
