"""
Security Service for Attendance Validation
Provides comprehensive security validation for attendance marking
"""

from datetime import datetime, timedelta, date
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app import models
import logging

logger = logging.getLogger(__name__)

class SecurityService:
    """Security service for attendance validation and fraud detection"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def validate_attendance_security(
        self, 
        employee_id: int, 
        photo_base64: Optional[str], 
        latitude: Optional[float], 
        longitude: Optional[float], 
        location_distance: float = 50.0
    ) -> Dict[str, Any]:
        """
        Comprehensive security validation for attendance marking
        
        Returns:
        - security_passed: bool - Overall security validation result
        - warnings: list - Non-critical security warnings
        - critical_issues: list - Critical security issues that block attendance
        - fraud_score: int - Overall fraud risk score (0-100)
        """
        
        warnings = []
        critical_issues = []
        fraud_score = 0
        
        try:
            # Get employee
            employee = self.db.query(models.Employee).filter(
                models.Employee.id == employee_id
            ).first()
            
            if not employee:
                critical_issues.append("Employee not found")
                return self._build_security_result(False, warnings, critical_issues, 100)
            
            # Check 1: Photo validation
            photo_validation = self._validate_photo_security(photo_base64)
            warnings.extend(photo_validation["warnings"])
            critical_issues.extend(photo_validation["critical_issues"])
            fraud_score += photo_validation["fraud_score"]
            
            # Check 2: Location validation
            location_validation = self._validate_location_security(
                employee_id, latitude, longitude, location_distance
            )
            warnings.extend(location_validation["warnings"])
            critical_issues.extend(location_validation["critical_issues"])
            fraud_score += location_validation["fraud_score"]
            
            # Check 3: Timing validation
            timing_validation = self._validate_timing_security(employee_id)
            warnings.extend(timing_validation["warnings"])
            critical_issues.extend(timing_validation["critical_issues"])
            fraud_score += timing_validation["fraud_score"]
            
            # Check 4: Pattern analysis
            pattern_validation = self._validate_pattern_security(employee_id)
            warnings.extend(pattern_validation["warnings"])
            critical_issues.extend(pattern_validation["critical_issues"])
            fraud_score += pattern_validation["fraud_score"]
            
            # Determine overall security status
            security_passed = len(critical_issues) == 0 and fraud_score < 70
            
            return self._build_security_result(security_passed, warnings, critical_issues, fraud_score)
            
        except Exception as e:
            logger.error(f"Security validation error for employee {employee_id}: {e}")
            critical_issues.append(f"Security validation system error: {str(e)}")
            return self._build_security_result(False, warnings, critical_issues, 100)
    
    def _validate_photo_security(self, photo_base64: Optional[str]) -> Dict[str, Any]:
        """Validate photo-related security aspects"""
        
        warnings = []
        critical_issues = []
        fraud_score = 0
        
        if not photo_base64:
            critical_issues.append("Photo is required for security validation")
            fraud_score += 50
            return {"warnings": warnings, "critical_issues": critical_issues, "fraud_score": fraud_score}
        
        # Basic photo format validation
        if not photo_base64.startswith('data:image/'):
            warnings.append("Photo format may be invalid")
            fraud_score += 10
        
        # Check photo size (basic validation)
        try:
            photo_data = photo_base64.split(',')[1] if ',' in photo_base64 else photo_base64
            photo_size = len(photo_data) * 3 / 4  # Approximate size in bytes
            
            if photo_size < 1000:  # Very small photo
                warnings.append("Photo appears to be very small - may be low quality")
                fraud_score += 15
            elif photo_size > 10 * 1024 * 1024:  # Very large photo
                warnings.append("Photo is unusually large")
                fraud_score += 5
                
        except Exception:
            warnings.append("Could not validate photo size")
            fraud_score += 10
        
        return {"warnings": warnings, "critical_issues": critical_issues, "fraud_score": fraud_score}
    
    def _validate_location_security(
        self, 
        employee_id: int, 
        latitude: Optional[float], 
        longitude: Optional[float], 
        location_distance: float
    ) -> Dict[str, Any]:
        """Validate location-related security aspects"""
        
        warnings = []
        critical_issues = []
        fraud_score = 0
        
        # Check for WFH approval
        today = date.today()
        wfh_request = self.db.query(models.WFHRequest).filter(
            models.WFHRequest.employee_id == employee_id,
            models.WFHRequest.request_date == today,
            models.WFHRequest.status == "approved"
        ).first()
        
        work_mode = "wfh" if wfh_request else "office"
        
        if work_mode == "office":
            if not latitude or not longitude:
                critical_issues.append("GPS location is required for office attendance")
                fraud_score += 40
                return {"warnings": warnings, "critical_issues": critical_issues, "fraud_score": fraud_score}
            
            # Check distance from office
            if location_distance > 100:  # More than 100m from office
                critical_issues.append(f"Location is {int(location_distance)}m from office (max 100m allowed)")
                fraud_score += 30
            elif location_distance > 50:  # 50-100m from office
                warnings.append(f"Location is {int(location_distance)}m from office")
                fraud_score += 10
        
        # Check for location pattern anomalies
        recent_attendance = self.db.query(models.Attendance).filter(
            models.Attendance.employee_id == employee_id,
            models.Attendance.date >= datetime.now() - timedelta(days=7),
            models.Attendance.latitude.isnot(None),
            models.Attendance.longitude.isnot(None)
        ).order_by(models.Attendance.date.desc()).limit(5).all()
        
        if latitude and longitude and recent_attendance:
            for att in recent_attendance:
                if att.latitude and att.longitude:
                    # Calculate distance from recent locations
                    distance = self._haversine_distance(
                        latitude, longitude, att.latitude, att.longitude
                    )
                    
                    # If location is very different from recent patterns
                    if distance > 5000:  # More than 5km difference
                        warnings.append("Location significantly different from recent attendance patterns")
                        fraud_score += 15
                        break
                    elif distance > 1000:  # More than 1km difference
                        warnings.append("Location differs from recent attendance patterns")
                        fraud_score += 5
                        break
        
        return {"warnings": warnings, "critical_issues": critical_issues, "fraud_score": fraud_score}
    
    def _validate_timing_security(self, employee_id: int) -> Dict[str, Any]:
        """Validate timing-related security aspects"""
        
        warnings = []
        critical_issues = []
        fraud_score = 0
        
        now = datetime.now()
        today = date.today()
        
        # Check for multiple attempts in short time
        recent_attempts = self.db.query(models.Attendance).filter(
            models.Attendance.employee_id == employee_id,
            models.Attendance.date >= now - timedelta(minutes=5)
        ).count()
        
        if recent_attempts > 0:
            critical_issues.append("Multiple attendance attempts detected within 5 minutes")
            fraud_score += 50
        
        # Check for weekend/holiday attendance without approval
        if today.weekday() >= 5:  # Weekend
            special_approval = self.db.query(models.WFHRequest).filter(
                models.WFHRequest.employee_id == employee_id,
                models.WFHRequest.request_date == today,
                models.WFHRequest.status == "approved"
            ).first()
            
            if not special_approval:
                warnings.append("Weekend attendance without special approval")
                fraud_score += 20
        
        # Check for very early or very late attendance
        current_time = now.time()
        if current_time < datetime.strptime("06:00", "%H:%M").time():
            warnings.append("Very early attendance time")
            fraud_score += 10
        elif current_time > datetime.strptime("23:00", "%H:%M").time():
            warnings.append("Very late attendance time")
            fraud_score += 10
        
        return {"warnings": warnings, "critical_issues": critical_issues, "fraud_score": fraud_score}
    
    def _validate_pattern_security(self, employee_id: int) -> Dict[str, Any]:
        """Validate attendance patterns for anomalies"""
        
        warnings = []
        critical_issues = []
        fraud_score = 0
        
        # Get recent attendance history
        recent_attendance = self.db.query(models.Attendance).filter(
            models.Attendance.employee_id == employee_id,
            models.Attendance.date >= datetime.now() - timedelta(days=30)
        ).order_by(models.Attendance.date.desc()).all()
        
        if len(recent_attendance) > 0:
            # Check for suspicious patterns
            
            # 1. Check for consistent exact timing (possible automation)
            check_in_times = [att.check_in.time() for att in recent_attendance if att.check_in]
            if len(check_in_times) >= 3:
                # Check if multiple check-ins are at exactly the same time
                time_counts = {}
                for time_obj in check_in_times:
                    time_str = time_obj.strftime("%H:%M")
                    time_counts[time_str] = time_counts.get(time_str, 0) + 1
                
                for time_str, count in time_counts.items():
                    if count >= 3:
                        warnings.append(f"Consistent check-in at exact time {time_str} detected")
                        fraud_score += 15
            
            # 2. Check for fraud flags in recent history
            fraud_flagged_count = sum(1 for att in recent_attendance if att.is_fraud_suspected)
            if fraud_flagged_count > 0:
                warnings.append(f"Previous fraud flags detected ({fraud_flagged_count} in last 30 days)")
                fraud_score += fraud_flagged_count * 5
            
            # 3. Check for approval requirement patterns
            pending_approvals = sum(1 for att in recent_attendance if att.requires_approval)
            if pending_approvals > 5:
                warnings.append("High number of attendance records requiring approval")
                fraud_score += 10
        
        return {"warnings": warnings, "critical_issues": critical_issues, "fraud_score": fraud_score}
    
    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two GPS coordinates in meters"""
        import math
        
        R = 6371e3  # Earth radius in meters
        phi1 = lat1 * math.pi / 180
        phi2 = lat2 * math.pi / 180
        delta_phi = (lat2 - lat1) * math.pi / 180
        delta_lambda = (lon2 - lon1) * math.pi / 180
        
        a = math.sin(delta_phi/2) * math.sin(delta_phi/2) + \
            math.cos(phi1) * math.cos(phi2) * \
            math.sin(delta_lambda/2) * math.sin(delta_lambda/2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    def _build_security_result(
        self, 
        security_passed: bool, 
        warnings: List[str], 
        critical_issues: List[str], 
        fraud_score: int
    ) -> Dict[str, Any]:
        """Build standardized security validation result"""
        
        return {
            "security_passed": security_passed,
            "warnings": warnings,
            "critical_issues": critical_issues,
            "fraud_score": min(fraud_score, 100),  # Cap at 100
            "validation_timestamp": datetime.utcnow().isoformat(),
            "summary": {
                "total_warnings": len(warnings),
                "total_critical_issues": len(critical_issues),
                "risk_level": self._get_risk_level(fraud_score)
            }
        }
    
    def _get_risk_level(self, fraud_score: int) -> str:
        """Get risk level based on fraud score"""
        if fraud_score >= 70:
            return "HIGH"
        elif fraud_score >= 40:
            return "MEDIUM"
        elif fraud_score >= 20:
            return "LOW"
        else:
            return "MINIMAL"

# Service factory
def get_security_service(db: Session) -> SecurityService:
    """Get security service instance"""
    return SecurityService(db)