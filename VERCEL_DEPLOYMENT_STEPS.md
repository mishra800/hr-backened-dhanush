# Vercel Backend Deployment Steps

## 🚀 **Method 1: Deploy via Vercel Dashboard (Recommended)**

### Step 1: Setup Database First
Before deploying, you need a PostgreSQL database. Choose one:

**Option A: Neon (Recommended - Free)**
1. Go to [neon.tech](https://neon.tech)
2. Sign up and create a new project
3. Copy the connection string (looks like: `postgresql://user:pass@host/dbname`)

**Option B: Supabase (Free)**
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings > Database
4. Copy the connection string

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. **IMPORTANT**: Set Root Directory to `backend`
6. Vercel will auto-detect it's a Python project

### Step 3: Configure Environment Variables
In Vercel dashboard, add these environment variables:

```
DATABASE_URL=postgresql://your-connection-string-here
SECRET_KEY=your-super-secure-secret-key-generate-new-one
ENVIRONMENT=production
DEBUG=False
FRONTEND_URL=https://your-netlify-app.netlify.app
CORS_ORIGINS=https://your-netlify-app.netlify.app
```

### Step 4: Deploy
1. Click "Deploy"
2. Wait for deployment to complete
3. You'll get a URL like: `https://your-app.vercel.app`

---

## 🔧 **Method 2: Deploy via CLI (if certificate issues are resolved)**

### Prerequisites
```bash
npm install -g vercel
```

### Steps
```bash
cd backend
vercel login
vercel
```

Follow the prompts and set environment variables.

---

## 🔑 **Required Environment Variables**

Set these in Vercel dashboard:

| Variable | Value | Example |
|----------|-------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `SECRET_KEY` | Secure random string | `your-super-secure-jwt-secret-key` |
| `ENVIRONMENT` | `production` | `production` |
| `DEBUG` | `False` | `False` |
| `FRONTEND_URL` | Your Netlify URL | `https://your-app.netlify.app` |
| `CORS_ORIGINS` | Your Netlify URL | `https://your-app.netlify.app` |

### Optional Variables (if using these features):
| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | For AI features |
| `GEMINI_API_KEY` | For AI features |
| `SMTP_SERVER` | For email notifications |
| `SMTP_USERNAME` | Email username |
| `SMTP_PASSWORD` | Email password |

---

## 🧪 **Testing Your Deployment**

After deployment:
1. Visit your Vercel URL
2. You should see: `{"message": "Welcome to AI HR Management System API"}`
3. Test an endpoint: `https://your-app.vercel.app/docs` (FastAPI docs)

---

## 🐛 **Troubleshooting**

### Common Issues:

**1. Database Connection Error**
- Verify DATABASE_URL is correct
- Ensure database allows external connections
- Check if database exists

**2. Import Errors**
- All dependencies should be in `requirements.txt`
- Check Python version compatibility

**3. CORS Errors**
- Update FRONTEND_URL and CORS_ORIGINS
- Redeploy after changing environment variables

**4. Function Timeout**
- Vercel free tier has 10s timeout
- Optimize slow database queries
- Consider upgrading to Pro plan

---

## 📝 **Next Steps After Backend Deployment**

1. ✅ Get your Vercel backend URL
2. ✅ Update frontend environment variable: `VITE_API_BASE_URL=https://your-backend.vercel.app`
3. ✅ Redeploy frontend with new backend URL
4. ✅ Test the full application

---

## 🔒 **Security Checklist**

- [ ] Generated new SECRET_KEY for production
- [ ] DATABASE_URL is secure and not exposed
- [ ] CORS_ORIGINS is restricted to your domain
- [ ] No sensitive data in code
- [ ] Environment variables set in Vercel dashboard (not in code)

Your backend should now be live at: `https://your-project-name.vercel.app`