@echo off
echo Deploying Backend to Vercel...
cd backend
echo Deploying to Vercel...
vercel --prod
echo Backend deployment complete!
pause