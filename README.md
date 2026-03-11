# InstaClone — Instagram Clone
Full-stack social media platform built with Node.js + React.

## Tech Stack
- **Backend:** Node.js 20 + Express.js 5 + MongoDB 7 + Socket.IO 4
- **Frontend:** React 18 + Vite + Tailwind CSS + Zustand + React Query

## Quick Start

### 1. Install dependencies
```bash
npm run install:all   # installs both backend and frontend
```

### 2. Set up environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your MongoDB URI, JWT secrets, etc.
```

### 3. Start MongoDB (must be running locally)
```bash
mongod
```

### 4. Run both servers
```bash
npm run dev
# Backend: http://localhost:5000
# Frontend: http://localhost:5173
```

## Project Structure
```
Instagram_by_Hikmtayar/
├── backend/
│   ├── src/
│   │   ├── models/         # 14 Mongoose schemas
│   │   ├── services/       # Business logic layer
│   │   ├── routes/         # Express API routes
│   │   ├── middleware/     # Auth, upload, validate, error
│   │   ├── socket/         # Socket.IO event handlers
│   │   └── server.js       # Express + Socket.IO entry point
│   ├── uploads/            # Media storage (gitignored)
│   └── .env                # Environment variables
└── frontend/
    └── src/
        ├── api/            # Axios client + Socket.IO
        ├── store/          # Zustand stores
        ├── pages/          # 13 page components
        ├── components/     # Reusable UI components
        └── hooks/          # Custom React hooks
```

## API Base URL
`http://localhost:5000/api/v1`

## Environment Variables
See `backend/.env.example` for all required variables.

# Instgarm_clone_By_Me
This is instgram clone
