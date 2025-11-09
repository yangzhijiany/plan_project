release: cd frontend && npm ci && npm run build || echo "Frontend build failed, continuing..."
web: cd backend && python3 -c "import sys; sys.path.insert(0, '.'); from database import init_db; init_db()" && python3 -m uvicorn main:app --host 0.0.0.0 --port $PORT
