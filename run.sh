#!/bin/bash
# VisioPitch — Start both backend and frontend

set -e

export PATH="$HOME/.local/bin:$PATH"

echo "✦ Starting VisioPitch..."
echo ""

# Start FastAPI backend
echo "→ Starting backend (FastAPI) on :8000..."
cd "$(dirname "$0")"
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start Vite frontend
echo "→ Starting frontend (Vite) on :5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✦ VisioPitch is running!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

# Trap Ctrl+C to kill both
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
