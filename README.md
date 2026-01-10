# PR Analyzer

A production-ready full-stack web application for analyzing GitHub Pull Requests, providing detailed insights about contributors, code quality, and PR metrics.

## Features

- **Repository Analysis**: Analyze any GitHub repository's PR activity
- **Branch Filtering**: Filter PRs by target branch
- **Time-based Filtering**: Analyze PRs from 2 weeks to all time
- **Contributor Insights**: Distinguish maintainers from regular contributors
- **User Profile Analysis**: Analyze any GitHub user's contribution history
- **Code Quality Metrics**: Lines changed, review time, merge time
- **Review Analytics**: Reviewer statistics and approval ratios
- **Export**: Download data as CSV, JSON, or PDF
- **OAuth Authentication**: Login with GitHub or Google
- **Data Persistence**: Save bookmarks, history, and preferences

## Tech Stack

- **Backend**: Express.js + TypeScript
- **Frontend**: React 18 + TypeScript + Vite
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis
- **Authentication**: GitHub OAuth 2.0 + Google OAuth 2.0

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- GitHub OAuth App (optional for higher rate limits)
- Google OAuth App (optional for Google login)

## Quick Start

### 1. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd pr-analyzer

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Start Infrastructure

```bash
# From project root
docker-compose up -d

# Verify services
docker ps
```

### 3. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Frontend
cp frontend/.env.example frontend/.env
```

### 4. Start Development Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 5. Access Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API Health: http://localhost:3001/health

## Environment Variables

### Backend (.env)

| Variable               | Description                          | Required |
| ---------------------- | ------------------------------------ | -------- |
| `NODE_ENV`             | Environment (development/production) | Yes      |
| `PORT`                 | Server port                          | Yes      |
| `MONGODB_URI`          | MongoDB connection string            | Yes      |
| `REDIS_HOST`           | Redis host                           | Yes      |
| `REDIS_PORT`           | Redis port                           | Yes      |
| `GITHUB_CLIENT_ID`     | GitHub OAuth client ID               | No       |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret           | No       |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID               | No       |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret           | No       |
| `SESSION_SECRET`       | Session encryption key               | Yes      |
| `JWT_SECRET`           | JWT signing key                      | Yes      |

### Frontend (.env)

| Variable        | Description      |
| --------------- | ---------------- |
| `VITE_API_URL`  | Backend API URL  |
| `VITE_APP_NAME` | Application name |

## API Endpoints

All endpoints return JSON responses.

### Authentication

- `GET /auth/github` - GitHub OAuth redirect
- `GET /auth/github/callback` - GitHub OAuth callback
- `GET /auth/google` - Google OAuth redirect
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

### Repository Analysis

- `GET /api/v1/repos/analyze` - Analyze repository
- `GET /api/v1/repos/:owner/:repo/branches` - List branches
- `GET /api/v1/repos/:owner/:repo/prs` - List PRs
- `GET /api/v1/repos/:owner/:repo/contributors` - List contributors

### User Profile

- `GET /api/v1/users/:username/profile` - User profile
- `GET /api/v1/users/:username/stats` - User statistics
- `GET /api/v1/users/compare` - Compare users

### Bookmarks & History (Authenticated)

- `GET /api/v1/bookmarks` - List bookmarks
- `POST /api/v1/bookmarks` - Add bookmark
- `DELETE /api/v1/bookmarks/:id` - Remove bookmark
- `GET /api/v1/history` - Analysis history

### Export

- `GET /api/v1/export/csv` - Export as CSV
- `GET /api/v1/export/json` - Export as JSON
- `POST /api/v1/export/pdf` - Export as PDF

## Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Reset data
docker-compose down -v
```

## Development

```bash
# Backend
cd backend
npm run dev      # Start dev server
npm run build    # Build for production
npm run test     # Run tests
npm run lint     # Run linter

# Frontend
cd frontend
npm run dev      # Start Vite dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Project Structure

```
pr-analyzer/
├── backend/
│   └── src/
│       ├── core/           # Domain layer
│       ├── infrastructure/ # Database, cache, external
│       ├── application/    # Business logic
│       ├── presentation/   # Controllers, middleware
│       └── shared/         # Utilities
├── frontend/
│   └── src/
│       ├── components/     # React components
│       ├── services/       # API services
│       └── types/          # TypeScript types
└── docker-compose.yml
```

## License

MIT
