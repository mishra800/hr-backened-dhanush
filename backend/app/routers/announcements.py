from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app import database, models, schemas
from app.dependencies import get_current_user

router = APIRouter(
    prefix="/announcements",
    tags=["announcements"]
)

@router.get("/", response_model=List[schemas.AnnouncementOut])
def get_announcements(db: Session = Depends(database.get_db)):
    anns = db.query(models.Announcement).order_by(models.Announcement.created_at.desc()).all()
    if not anns:
        # Seed
        seed = models.Announcement(
            title="Welcome to the New HR System!",
            content="We are excited to launch our new AI-powered HR platform. Please update your profiles.",
            posted_by=1 # Admin
        )
        db.add(seed)
        db.commit()
        anns = db.query(models.Announcement).all()
    return anns

@router.post("/", response_model=schemas.AnnouncementOut)
def create_announcement(ann: schemas.AnnouncementCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    # Only Admin/HR
    db_ann = models.Announcement(**ann.dict(), posted_by=current_user.id)
    db.add(db_ann)
    db.commit()
    db.refresh(db_ann)
    return db_ann
