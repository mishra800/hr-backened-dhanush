from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
import os
from app.routers import (
    auth,
    recruitment,
    recruitment_enhanced,
    employees,
    attendance,
    attendance_extensions,
    mobile_api,
    onboarding,
    performance,
    engagement,
    learning,
    analysis,
    analysis_enhanced,
    career,
    leave,
    payroll,
    users,
    dashboard,
    ai_interview,
    assets,
    acknowledgments,
    infrastructure,
    announcements,
    admin,
    talent_pool,
    agency_portal,
    bulk_upload,
    candidate_portal,
    assessment,
    notifications,
    ai_assistant
)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI HR Management System API")

# CORS setup
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175", # Future proofing
    "https://*.netlify.app",  # Netlify deployment
    "https://*.vercel.app",   # Vercel deployment
]

# Add environment-based origins
import os
if os.getenv("FRONTEND_URL"):
    origins.append(os.getenv("FRONTEND_URL"))

# Allow all origins in production (you can restrict this later)
if os.getenv("ENVIRONMENT") == "production":
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to AI HR Management System API"}

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(recruitment.router)
app.include_router(recruitment_enhanced.router)
app.include_router(employees.router)
app.include_router(attendance.router)
app.include_router(attendance_extensions.router)
app.include_router(mobile_api.router)
app.include_router(onboarding.router)
app.include_router(performance.router)
app.include_router(engagement.router)
app.include_router(learning.router)
app.include_router(analysis.router)
app.include_router(analysis_enhanced.router)
app.include_router(career.router)
app.include_router(leave.router)
app.include_router(payroll.router)
app.include_router(dashboard.router)
app.include_router(ai_interview.router)
app.include_router(assets.router)
app.include_router(acknowledgments.router)
app.include_router(infrastructure.router)
app.include_router(announcements.router)
app.include_router(admin.router)
app.include_router(talent_pool.router)
app.include_router(agency_portal.router)
app.include_router(bulk_upload.router)
app.include_router(candidate_portal.router)
app.include_router(assessment.router)
app.include_router(notifications.router)
app.include_router(ai_assistant.router)

# Mount static files for serving uploaded resumes
uploads_dir = "uploads"
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)

# Mount with proper headers for file downloads
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import Request

class CustomStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        
        # Set proper headers for file downloads
        if path.endswith(('.docx', '.doc')):
            response.headers["content-type"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            response.headers["content-disposition"] = f"attachment; filename={os.path.basename(path)}"
        elif path.endswith('.pdf'):
            response.headers["content-type"] = "application/pdf"
            response.headers["content-disposition"] = f"inline; filename={os.path.basename(path)}"
        
        return response

app.mount("/uploads", CustomStaticFiles(directory=uploads_dir), name="uploads")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)