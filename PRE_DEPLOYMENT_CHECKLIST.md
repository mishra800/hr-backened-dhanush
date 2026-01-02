# Pre-Deployment Checklist

Before deploying your HR Management System, ensure you complete these steps:

## ✅ Database Setup

- [ ] Create a PostgreSQL database (Neon, Supabase, Railway, etc.)
- [ ] Note down the DATABASE_URL connection string
- [ ] Test database connectivity
- [ ] Ensure database allows external connections

## ✅ Environment Variables

### Backend (Vercel)
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `SECRET_KEY` - Secure random string for JWT (generate new one for production)
- [ ] `ENVIRONMENT` - Set to "production"
- [ ] `DEBUG` - Set to "False"
- [ ] `FRONTEND_URL` - Your Netlify domain (set after frontend deployment)
- [ ] `CORS_ORIGINS` - Your Netlify domain
- [ ] Email settings (SMTP_SERVER, SMTP_USERNAME, etc.) if using email features
- [ ] AI API keys (OPENAI_API_KEY, GEMINI_API_KEY) if using AI features
- [ ] Twilio settings if using SMS/WhatsApp features

### Frontend (Netlify)
- [ ] `VITE_API_BASE_URL` - Your Vercel backend domain

## ✅ Code Preparation

- [ ] All hardcoded localhost URLs replaced with environment variables
- [ ] All sensitive data removed from code
- [ ] Dependencies updated in requirements.txt and package.json
- [ ] Build process tested locally
- [ ] No console.log statements in production code (optional cleanup)

## ✅ Security

- [ ] Generate a new, secure SECRET_KEY for production
- [ ] Verify no sensitive data in git history
- [ ] CORS origins restricted to your actual domains
- [ ] Database credentials secured
- [ ] API keys secured and not in code

## ✅ Testing

- [ ] Application runs locally with production environment variables
- [ ] All major features tested
- [ ] Database migrations work correctly
- [ ] File uploads work (if using file features)
- [ ] Authentication flow works
- [ ] API endpoints respond correctly

## ✅ Accounts & Access

- [ ] Vercel account created and CLI installed
- [ ] Netlify account created and CLI installed
- [ ] GitHub repository created and code pushed
- [ ] Database provider account created

## ✅ Domain & SSL

- [ ] Custom domain configured (optional)
- [ ] SSL certificates configured (automatic with Netlify/Vercel)
- [ ] DNS settings updated if using custom domain

## ✅ Monitoring & Backup

- [ ] Error tracking setup (optional - Sentry, LogRocket, etc.)
- [ ] Database backup strategy planned
- [ ] Monitoring alerts configured (optional)

## ✅ Documentation

- [ ] Environment variables documented
- [ ] Deployment process documented
- [ ] Admin credentials noted securely
- [ ] API documentation updated with production URLs

## Quick Commands for Testing

### Test Backend Locally with Production Settings:
```bash
cd backend
# Set environment variables
python main.py
```

### Test Frontend Build:
```bash
cd frontend
npm run build
npm run preview
```

### Generate Secure Secret Key:
```python
import secrets
print(secrets.token_urlsafe(32))
```

## Post-Deployment Verification

After deployment, verify:
- [ ] Frontend loads without errors
- [ ] Login functionality works
- [ ] Database connections established
- [ ] API calls successful
- [ ] File uploads work (if applicable)
- [ ] Email notifications work (if configured)
- [ ] All major user flows functional

## Rollback Plan

- [ ] Keep previous working version tagged in git
- [ ] Know how to quickly revert deployments
- [ ] Have database backup before major changes
- [ ] Document rollback procedures

---

**Note**: Complete this checklist before proceeding with deployment to avoid common issues and ensure a smooth launch.