# Deployment Guide

This guide will help you deploy your HR Management System to Netlify (frontend) and Vercel (backend).

## Prerequisites

1. **Database Setup**: You'll need a PostgreSQL database. Recommended providers:
   - [Neon](https://neon.tech/) (Free tier available)
   - [Supabase](https://supabase.com/) (Free tier available)
   - [Railway](https://railway.app/) (Free tier available)
   - [ElephantSQL](https://www.elephantsql.com/) (Free tier available)

2. **Accounts**:
   - [Vercel Account](https://vercel.com/) (for backend)
   - [Netlify Account](https://netlify.com/) (for frontend)
   - GitHub account (for code repository)

## Step 1: Database Setup

1. Create a PostgreSQL database with your chosen provider
2. Note down the connection string (DATABASE_URL)
3. Run the database migrations (the app will create tables automatically on first run)

## Step 2: Backend Deployment (Vercel)

### Option A: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Navigate to backend directory:
   ```bash
   cd backend
   ```

3. Login to Vercel:
   ```bash
   vercel login
   ```

4. Deploy:
   ```bash
   vercel
   ```

5. Set environment variables in Vercel dashboard or via CLI:
   ```bash
   vercel env add DATABASE_URL
   vercel env add SECRET_KEY
   vercel env add ENVIRONMENT
   # Add other environment variables as needed
   ```

### Option B: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Set the root directory to `backend`
6. Add environment variables in the Environment Variables section:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `SECRET_KEY`: A secure random string for JWT tokens
   - `ENVIRONMENT`: `production`
   - `DEBUG`: `False`
   - `FRONTEND_URL`: Your Netlify domain (add after frontend deployment)
   - Add other variables from `.env.production` as needed

7. Deploy

### Environment Variables for Backend (Vercel)

Copy these from `backend/.env.production` and set them in Vercel:

```
DATABASE_URL=postgresql://username:password@host:port/database_name
SECRET_KEY=your-production-secret-key-here-make-it-very-secure
DEBUG=False
ENVIRONMENT=production
FRONTEND_URL=https://your-frontend-domain.netlify.app
CORS_ORIGINS=https://your-frontend-domain.netlify.app
```

## Step 3: Frontend Deployment (Netlify)

### Option A: Deploy via Netlify CLI

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Login to Netlify:
   ```bash
   netlify login
   ```

5. Deploy:
   ```bash
   netlify deploy --prod --dir=dist
   ```

### Option B: Deploy via Netlify Dashboard

1. Push your code to GitHub
2. Go to [Netlify Dashboard](https://app.netlify.com/)
3. Click "New site from Git"
4. Connect your GitHub repository
5. Set build settings:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`
6. Add environment variables:
   - `VITE_API_BASE_URL`: Your Vercel backend URL
7. Deploy

### Environment Variables for Frontend (Netlify)

Set this in Netlify environment variables:

```
VITE_API_BASE_URL=https://your-backend-domain.vercel.app
```

## Step 4: Update CORS Settings

After both deployments:

1. Update the `FRONTEND_URL` environment variable in Vercel with your Netlify domain
2. Update the `CORS_ORIGINS` environment variable in Vercel with your Netlify domain
3. Redeploy the backend if needed

## Step 5: Test Your Deployment

1. Visit your Netlify frontend URL
2. Try logging in and using various features
3. Check browser console for any API errors
4. Verify database connections are working

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure your Netlify domain is added to CORS_ORIGINS in backend
2. **Database Connection**: Verify your DATABASE_URL is correct
3. **Environment Variables**: Ensure all required env vars are set in both platforms
4. **Build Errors**: Check build logs in respective dashboards

### Backend Issues:
- Check Vercel function logs
- Verify all Python dependencies are in requirements.txt
- Ensure database is accessible from Vercel

### Frontend Issues:
- Check Netlify build logs
- Verify API_BASE_URL is correctly set
- Ensure all npm dependencies are installed

## Security Considerations

1. **Never commit sensitive data** to your repository
2. **Use strong SECRET_KEY** for JWT tokens
3. **Restrict CORS origins** to your actual domains
4. **Use HTTPS** for all production URLs
5. **Regularly update dependencies**

## Monitoring and Maintenance

1. Set up monitoring for your database
2. Monitor Vercel function usage and limits
3. Monitor Netlify bandwidth usage
4. Set up error tracking (e.g., Sentry)
5. Regular database backups

## Cost Considerations

### Free Tier Limits:
- **Vercel**: 100GB bandwidth, 100GB-hours compute time
- **Netlify**: 100GB bandwidth, 300 build minutes
- **Database providers**: Usually 1GB storage, limited connections

### Scaling:
- Monitor usage and upgrade plans as needed
- Consider CDN for static assets
- Optimize database queries for better performance

## Support

If you encounter issues:
1. Check the deployment logs
2. Verify environment variables
3. Test API endpoints directly
4. Check database connectivity
5. Review CORS settings

Your application should now be live and accessible via your Netlify domain!