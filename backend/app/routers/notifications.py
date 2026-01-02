from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Dict
from app import database, models, schemas
from app.dependencies import get_current_user
from datetime import datetime
import json

router = APIRouter(
    prefix="/notifications",
    tags=["notifications"]
)

# WebSocket connection manager for real-time notifications
class NotificationManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket
    
    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
    
    async def send_personal_notification(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message))
            except:
                # Connection is broken, remove it
                self.disconnect(user_id)
    
    async def broadcast_to_roles(self, roles: List[str], message: dict, db: Session):
        """Broadcast notification to all users with specific roles"""
        users = db.query(models.User).filter(
            models.User.role.in_(roles),
            models.User.is_active == True
        ).all()
        
        for user in users:
            await self.send_personal_notification(user.id, message)

# Global notification manager instance
notification_manager = NotificationManager()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    """WebSocket endpoint for real-time notifications"""
    await notification_manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive and listen for client messages
            data = await websocket.receive_text()
            # Echo back for heartbeat
            await websocket.send_text(f"Heartbeat: {data}")
    except WebSocketDisconnect:
        notification_manager.disconnect(user_id)

@router.get("/", response_model=List[dict])
def get_user_notifications(
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get user's in-app notifications"""
    
    query = db.query(models.InAppNotification).filter(
        models.InAppNotification.user_id == current_user.id
    )
    
    if unread_only:
        query = query.filter(models.InAppNotification.is_read == False)
    
    notifications = query.order_by(
        models.InAppNotification.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return [
        {
            "id": notif.id,
            "title": notif.title,
            "message": notif.message,
            "type": notif.type,
            "action_url": notif.action_url,
            "notification_data": notif.notification_data,
            "is_read": notif.is_read,
            "created_at": notif.created_at.isoformat(),
            "read_at": notif.read_at.isoformat() if notif.read_at else None
        }
        for notif in notifications
    ]

@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get count of unread notifications"""
    
    count = db.query(models.InAppNotification).filter(
        models.InAppNotification.user_id == current_user.id,
        models.InAppNotification.is_read == False
    ).count()
    
    return {"unread_count": count}

@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Mark a notification as read"""
    
    notification = db.query(models.InAppNotification).filter(
        models.InAppNotification.id == notification_id,
        models.InAppNotification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    notification.read_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Notification marked as read"}

@router.patch("/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Mark all notifications as read for current user"""
    
    db.query(models.InAppNotification).filter(
        models.InAppNotification.user_id == current_user.id,
        models.InAppNotification.is_read == False
    ).update({
        "is_read": True,
        "read_at": datetime.utcnow()
    })
    
    db.commit()
    
    return {"message": "All notifications marked as read"}

@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a notification"""
    
    notification = db.query(models.InAppNotification).filter(
        models.InAppNotification.id == notification_id,
        models.InAppNotification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notification)
    db.commit()
    
    return {"message": "Notification deleted"}

@router.post("/test-notification")
async def send_test_notification(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Send a test notification (admin only)"""
    
    if current_user.role not in ['admin', 'hr']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Create test notification
    notification = models.InAppNotification(
        user_id=current_user.id,
        title="Test Notification",
        message="This is a test notification to verify the system is working.",
        type="info"
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    # Send real-time notification
    await notification_manager.send_personal_notification(
        current_user.id,
        {
            "type": "new_notification",
            "notification": {
                "id": notification.id,
                "title": notification.title,
                "message": notification.message,
                "type": notification.type,
                "created_at": notification.created_at.isoformat()
            }
        }
    )
    
    return {"message": "Test notification sent"}

@router.get("/preferences", response_model=dict)
def get_notification_preferences(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get user's notification preferences"""
    
    prefs = db.query(models.NotificationPreference).filter(
        models.NotificationPreference.user_id == current_user.id
    ).first()
    
    if not prefs:
        # Create default preferences
        prefs = models.NotificationPreference(
            user_id=current_user.id,
            email_enabled=True,
            sms_enabled=False,
            whatsapp_enabled=False
        )
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    
    return {
        "email_enabled": prefs.email_enabled,
        "sms_enabled": prefs.sms_enabled,
        "whatsapp_enabled": prefs.whatsapp_enabled,
        "phone_number": prefs.phone_number,
        "whatsapp_number": prefs.whatsapp_number
    }

@router.patch("/preferences")
def update_notification_preferences(
    preferences: dict,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update user's notification preferences"""
    
    prefs = db.query(models.NotificationPreference).filter(
        models.NotificationPreference.user_id == current_user.id
    ).first()
    
    if not prefs:
        prefs = models.NotificationPreference(user_id=current_user.id)
        db.add(prefs)
    
    # Update preferences
    if "email_enabled" in preferences:
        prefs.email_enabled = preferences["email_enabled"]
    if "sms_enabled" in preferences:
        prefs.sms_enabled = preferences["sms_enabled"]
    if "whatsapp_enabled" in preferences:
        prefs.whatsapp_enabled = preferences["whatsapp_enabled"]
    if "phone_number" in preferences:
        prefs.phone_number = preferences["phone_number"]
    if "whatsapp_number" in preferences:
        prefs.whatsapp_number = preferences["whatsapp_number"]
    
    prefs.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Notification preferences updated"}

# Export the notification manager for use in other modules
__all__ = ["notification_manager"]