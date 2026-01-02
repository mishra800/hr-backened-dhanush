@echo off
echo Building HR Management System Frontend...
cd frontend
echo Installing dependencies...
npm install
echo Building for production...
npm run build
echo Build complete!
cd ..
echo Frontend is ready for deployment!
pause