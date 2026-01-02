"""
Bulk Resume Upload Router
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import uuid
from app import database, models
from app.resume_parser import parse_resume  # Existing parser
from pydantic import BaseModel

router = APIRouter(
    prefix="/bulk-upload",
    tags=["bulk-upload"]
)

# ============================================
# CONFIGURATION
# ============================================

UPLOAD_DIR = "backend/uploads/bulk_resumes"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".rtf"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB per file
MAX_FILES_PER_BATCH = 100

# ============================================
# SCHEMAS
# ============================================

class BulkUploadStatus(BaseModel):
    upload_id: int
    status: str
    total_files: int
    successful_parses: int
    failed_parses: int
    progress_percentage: float

# ============================================
# HELPER FUNCTIONS
# ============================================

def is_allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS

async def process_resume_file(
    file_path: str,
    filename: str,
    job_id: int,
    bulk_upload_id: int,
    db: Session
):
    """Process a single resume file"""
    
    bulk_file = models.BulkUploadFile(
        bulk_upload_id=bulk_upload_id,
        filename=filename,
        file_url=file_path,
        parse_status="processing"
    )
    db.add(bulk_file)
    db.commit()
    db.refresh(bulk_file)
    
    try:
        # Parse resume
        parsed_data = parse_resume(file_path)
        
        if not parsed_data.get("email"):
            raise Exception("Email not found in resume")
        
        # Check if candidate already applied
        existing = db.query(models.Application).filter(
            models.Application.job_id == job_id,
            models.Application.candidate_email == parsed_data["email"]
        ).first()
        
        if existing:
            raise Exception("Candidate already applied for this job")
        
        # Create application
        application = models.Application(
            job_id=job_id,
            candidate_name=parsed_data.get("name", "Unknown"),
            candidate_email=parsed_data["email"],
            phone=parsed_data.get("phone"),
            resume_url=file_path,
            source="bulk_upload",
            status="applied",
            skills=parsed_data.get("skills", []),
            years_of_experience=parsed_data.get("experience_years"),
            education=parsed_data.get("education", []),
            certifications=parsed_data.get("certifications", [])
        )
        
        db.add(application)
        db.flush()
        
        # Update bulk file record
        bulk_file.application_id = application.id
        bulk_file.parse_status = "success"
        bulk_file.parsed_data = parsed_data
        
        # Update bulk upload success count
        bulk_upload = db.query(models.BulkUpload).filter(
            models.BulkUpload.id == bulk_upload_id
        ).first()
        bulk_upload.successful_parses += 1
        
        db.commit()
        
        return {"success": True, "application_id": application.id}
        
    except Exception as e:
        # Update bulk file record with error
        bulk_file.parse_status = "failed"
        bulk_file.parse_error = str(e)
        
        # Update bulk upload failed count
        bulk_upload = db.query(models.BulkUpload).filter(
            models.BulkUpload.id == bulk_upload_id
        ).first()
        bulk_upload.failed_parses += 1
        bulk_upload.error_log = bulk_upload.error_log + [{"filename": filename, "error": str(e)}]
        
        db.commit()
        
        return {"success": False, "error": str(e)}

# ============================================
# ENDPOINTS
# ============================================

@router.post("/upload/{job_id}")
async def bulk_upload_resumes(
    job_id: int,
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = None,
    current_user_id: int = 1,  # TODO: Get from auth
    db: Session = Depends(database.get_db)
):
    """Upload multiple resumes at once"""
    
    # Verify job exists
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Validate number of files
    if len(files) > MAX_FILES_PER_BATCH:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_FILES_PER_BATCH} files allowed per batch"
        )
    
    # Validate file types and sizes
    for file in files:
        if not is_allowed_file(file.filename):
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed: {file.filename}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Check file size (approximate)
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large: {file.filename}. Max size: 5MB"
            )
    
    # Create bulk upload record
    bulk_upload = models.BulkUpload(
        job_id=job_id,
        uploaded_by=current_user_id,
        total_files=len(files),
        status="processing"
    )
    db.add(bulk_upload)
    db.commit()
    db.refresh(bulk_upload)
    
    # Save files and process
    uploaded_files = []
    
    for file in files:
        # Generate unique filename
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save file
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        uploaded_files.append({
            "original_name": file.filename,
            "file_path": file_path
        })
    
    # Process files (synchronously for now, can be made async)
    results = []
    for file_info in uploaded_files:
        result = await process_resume_file(
            file_path=file_info["file_path"],
            filename=file_info["original_name"],
            job_id=job_id,
            bulk_upload_id=bulk_upload.id,
            db=db
        )
        results.append({
            "filename": file_info["original_name"],
            **result
        })
    
    # Update bulk upload status
    bulk_upload.status = "completed"
    bulk_upload.completed_at = datetime.utcnow()
    db.commit()
    
    return {
        "upload_id": bulk_upload.id,
        "total_files": len(files),
        "successful": bulk_upload.successful_parses,
        "failed": bulk_upload.failed_parses,
        "results": results
    }

@router.get("/status/{upload_id}")
async def get_bulk_upload_status(
    upload_id: int,
    db: Session = Depends(database.get_db)
):
    """Get status of bulk upload"""
    
    bulk_upload = db.query(models.BulkUpload).filter(
        models.BulkUpload.id == upload_id
    ).first()
    
    if not bulk_upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    # Get file details
    files = db.query(models.BulkUploadFile).filter(
        models.BulkUploadFile.bulk_upload_id == upload_id
    ).all()
    
    progress = 0
    if bulk_upload.total_files > 0:
        processed = bulk_upload.successful_parses + bulk_upload.failed_parses
        progress = (processed / bulk_upload.total_files) * 100
    
    return {
        "upload_id": upload_id,
        "status": bulk_upload.status,
        "total_files": bulk_upload.total_files,
        "successful_parses": bulk_upload.successful_parses,
        "failed_parses": bulk_upload.failed_parses,
        "progress_percentage": round(progress, 2),
        "created_at": bulk_upload.created_at,
        "completed_at": bulk_upload.completed_at,
        "error_log": bulk_upload.error_log,
        "files": [
            {
                "filename": f.filename,
                "status": f.parse_status,
                "error": f.parse_error,
                "application_id": f.application_id
            }
            for f in files
        ]
    }

@router.get("/history")
async def get_bulk_upload_history(
    job_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(database.get_db)
):
    """Get bulk upload history"""
    
    query = db.query(models.BulkUpload)
    
    if job_id:
        query = query.filter(models.BulkUpload.job_id == job_id)
    
    total = query.count()
    uploads = query.order_by(models.BulkUpload.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for upload in uploads:
        result.append({
            "upload_id": upload.id,
            "job_id": upload.job_id,
            "job_title": upload.job.title if upload.job else "N/A",
            "uploaded_by": upload.uploaded_by,
            "total_files": upload.total_files,
            "successful": upload.successful_parses,
            "failed": upload.failed_parses,
            "status": upload.status,
            "created_at": upload.created_at,
            "completed_at": upload.completed_at
        })
    
    return {
        "total": total,
        "uploads": result
    }

@router.delete("/{upload_id}")
async def delete_bulk_upload(
    upload_id: int,
    db: Session = Depends(database.get_db)
):
    """Delete bulk upload record (not the applications)"""
    
    bulk_upload = db.query(models.BulkUpload).filter(
        models.BulkUpload.id == upload_id
    ).first()
    
    if not bulk_upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    # Delete associated files from disk
    files = db.query(models.BulkUploadFile).filter(
        models.BulkUploadFile.bulk_upload_id == upload_id
    ).all()
    
    for file in files:
        if os.path.exists(file.file_url):
            try:
                os.remove(file.file_url)
            except:
                pass
    
    # Delete from database
    db.delete(bulk_upload)
    db.commit()
    
    return {"message": "Bulk upload deleted successfully"}

@router.get("/stats")
async def get_bulk_upload_stats(
    db: Session = Depends(database.get_db)
):
    """Get bulk upload statistics"""
    
    total_uploads = db.query(models.BulkUpload).count()
    total_files = db.query(func.sum(models.BulkUpload.total_files)).scalar() or 0
    total_successful = db.query(func.sum(models.BulkUpload.successful_parses)).scalar() or 0
    total_failed = db.query(func.sum(models.BulkUpload.failed_parses)).scalar() or 0
    
    success_rate = (total_successful / total_files * 100) if total_files > 0 else 0
    
    return {
        "total_uploads": total_uploads,
        "total_files_processed": total_files,
        "total_successful": total_successful,
        "total_failed": total_failed,
        "success_rate": round(success_rate, 2)
    }
