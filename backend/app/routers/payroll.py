from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from app import database, models, schemas
from app.payroll_service import PayrollService
from app.dependencies import get_current_user
from app.role_utils import require_role
from pydantic import BaseModel
import io
import pandas as pd
from fastapi.responses import StreamingResponse

router = APIRouter(
    prefix="/payroll",
    tags=["payroll"]
)

# Request Models
class PayrollCalculationRequest(BaseModel):
    month: str
    employee_ids: Optional[List[int]] = None
    manual_adjustments: Optional[Dict[str, Any]] = None

class SalaryStructureRequest(BaseModel):
    employee_id: int
    basic_salary: float
    hra: float
    transport_allowance: Optional[float] = 0.0
    medical_allowance: Optional[float] = 0.0
    special_allowance: Optional[float] = 0.0
    other_allowances: Optional[float] = 0.0
    effective_date: Optional[datetime] = None

class PayrollApprovalRequest(BaseModel):
    payroll_ids: List[int]

class ManualAdjustmentRequest(BaseModel):
    payroll_id: int
    adjustments: Dict[str, Any]
    notes: Optional[str] = None

# Employee Payroll Endpoints (Accessible by Employee, HR, Admin)

@router.get("/my-payroll", response_model=List[schemas.PayrollOut])
def get_my_payroll(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get current user's payroll history"""
    # Get employee record for current user
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee record not found")
    
    payrolls = db.query(models.Payroll).filter(
        models.Payroll.employee_id == employee.id
    ).order_by(models.Payroll.month.desc()).all()
    
    return payrolls

@router.get("/my-payslip/{payroll_id}")
def get_my_payslip(
    payroll_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get payslip for current user"""
    # Get employee record for current user
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee record not found")
    
    # Verify payroll belongs to current user
    payroll = db.query(models.Payroll).filter(
        models.Payroll.id == payroll_id,
        models.Payroll.employee_id == employee.id
    ).first()
    
    if not payroll:
        raise HTTPException(status_code=404, detail="Payslip not found")
    
    payroll_service = PayrollService(db)
    result = payroll_service.generate_payslip_data(payroll_id)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result["payslip"]

# HR/Admin Payroll Management Endpoints

@router.get("/employees/{employee_id}/payroll", response_model=List[schemas.PayrollOut])
def get_employee_payroll(
    employee_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role(["admin", "hr", "hr_manager", "super_admin"]))
):
    """Get payroll history for a specific employee (HR/Admin only)"""
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    payrolls = db.query(models.Payroll).filter(
        models.Payroll.employee_id == employee_id
    ).order_by(models.Payroll.month.desc()).all()
    
    return payrolls

@router.post("/calculate")
def calculate_payroll(
    request: PayrollCalculationRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role(["admin", "hr", "hr_manager", "super_admin"]))
):
    """Calculate payroll for employees"""
    payroll_service = PayrollService(db)
    
    if request.employee_ids:
        # Calculate for specific employees
        results = []
        for emp_id in request.employee_ids:
            result = payroll_service.calculate_employee_payroll(
                emp_id, 
                request.month, 
                request.manual_adjustments,
                current_user.id
            )
            results.append(result)
        return {"results": results}
    else:
        # Bulk calculate for all employees
        result = payroll_service.bulk_calculate_payroll(
            request.month, 
            calculated_by=current_user.id
        )
        return result

@router.post("/approve")
def approve_payrolls(
    request: PayrollApprovalRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role(["admin", "hr_manager", "super_admin"]))
):
    """Approve payroll records"""
    payroll_service = PayrollService(db)
    results = []
    
    for payroll_id in request.payroll_ids:
        result = payroll_service.approve_payroll(payroll_id, current_user.id)
        results.append({"payroll_id": payroll_id, "result": result})
    
    return {"results": results}

@router.put("/manual-adjustment")
def apply_manual_adjustment(
    request: ManualAdjustmentRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role(["admin", "hr", "hr_manager", "super_admin"]))
):
    """Apply manual adjustments to payroll"""
    payroll = db.query(models.Payroll).filter(models.Payroll.id == request.payroll_id).first()
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    
    if payroll.status not in ["draft", "calculated"]:
        raise HTTPException(status_code=400, detail="Cannot modify approved payroll")
    
    # Recalculate with manual adjustments
    payroll_service = PayrollService(db)
    result = payroll_service.calculate_employee_payroll(
        payroll.employee_id,
        payroll.month,
        request.adjustments,
        current_user.id
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    # Add notes
    if request.notes:
        payroll.calculation_notes = f"{payroll.calculation_notes}\n{request.notes}"
        db.commit()
    
    return result["payroll"]

# Salary Structure Management

@router.post("/salary-structure")
def create_salary_structure(
    request: SalaryStructureRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role(["admin", "hr", "hr_manager", "super_admin"]))
):
    """Create or update salary structure for an employee"""
    # Check if employee exists
    employee = db.query(models.Employee).filter(models.Employee.id == request.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Create new salary structure
    salary_structure = models.SalaryStructure(
        employee_id=request.employee_id,
        basic_salary=request.basic_salary,
        hra=request.hra,
        transport_allowance=request.transport_allowance,
        medical_allowance=request.medical_allowance,
        special_allowance=request.special_allowance,
        other_allowances=request.other_allowances,
        effective_date=request.effective_date or datetime.utcnow()
    )
    
    db.add(salary_structure)
    db.commit()
    db.refresh(salary_structure)
    
    return salary_structure

@router.get("/salary-structure/{employee_id}")
def get_salary_structure(
    employee_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get current salary structure for an employee"""
    # Check permissions - employees can only view their own
    if current_user.role not in ["admin", "hr", "hr_manager", "super_admin"]:
        employee = db.query(models.Employee).filter(
            models.Employee.id == employee_id,
            models.Employee.user_id == current_user.id
        ).first()
        if not employee:
            raise HTTPException(status_code=403, detail="Access denied")
    
    salary_structure = db.query(models.SalaryStructure).filter(
        models.SalaryStructure.employee_id == employee_id
    ).order_by(models.SalaryStructure.effective_date.desc()).first()
    
    if not salary_structure:
        raise HTTPException(status_code=404, detail="Salary structure not found")
    
    return salary_structure

# Payroll Reports and Analytics

@router.get("/summary/{month}")
def get_payroll_summary(
    month: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role(["admin", "hr", "hr_manager", "super_admin"]))
):
    """Get payroll summary for a month"""
    payroll_service = PayrollService(db)
    result = payroll_service.get_payroll_summary(month)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result["summary"]

@router.get("/reports/monthly")
def get_monthly_payroll_report(
    month: str,
    format: str = Query("json", regex="^(json|excel)$"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role(["admin", "hr", "hr_manager", "super_admin"]))
):
    """Get monthly payroll report"""
    payrolls = db.query(models.Payroll).filter(models.Payroll.month == month).all()
    
    if format == "excel":
        # Generate Excel report
        data = []
        for payroll in payrolls:
            employee = payroll.employee
            data.append({
                "Employee ID": employee.id,
                "Employee Name": f"{employee.first_name} {employee.last_name}",
                "Month": payroll.month,
                "Basic Salary": payroll.basic_salary,
                "HRA": payroll.hra,
                "Transport Allowance": payroll.transport_allowance,
                "Medical Allowance": payroll.medical_allowance,
                "Special Allowance": payroll.special_allowance,
                "Bonus": payroll.bonus,
                "Overtime Amount": payroll.overtime_amount,
                "Other Allowances": payroll.other_allowances,
                "Gross Salary": payroll.gross_salary,
                "PF": payroll.pf,
                "ESI": payroll.esi,
                "Professional Tax": payroll.professional_tax,
                "Income Tax": payroll.income_tax,
                "Loan Deduction": payroll.loan_deduction,
                "Other Deductions": payroll.other_deductions,
                "Total Deductions": payroll.total_deductions,
                "Net Salary": payroll.net_salary,
                "Working Days": payroll.total_working_days,
                "Actual Days": payroll.actual_working_days,
                "Leave Days": payroll.leave_days,
                "Status": payroll.status
            })
        
        df = pd.DataFrame(data)
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Payroll Report', index=False)
        
        output.seek(0)
        
        return StreamingResponse(
            io.BytesIO(output.read()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=payroll_report_{month}.xlsx"}
        )
    
    # Return JSON format
    return [
        {
            "payroll_id": p.id,
            "employee_id": p.employee_id,
            "employee_name": f"{p.employee.first_name} {p.employee.last_name}",
            "month": p.month,
            "gross_salary": p.gross_salary,
            "total_deductions": p.total_deductions,
            "net_salary": p.net_salary,
            "status": p.status
        }
        for p in payrolls
    ]

@router.get("/analytics/trends")
def get_payroll_trends(
    months: int = Query(6, ge=1, le=24),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role(["admin", "hr", "hr_manager", "super_admin"]))
):
    """Get payroll trends over multiple months"""
    # This would implement trend analysis
    # For now, return a placeholder
    return {"message": "Payroll trends analysis - to be implemented"}

# Legacy endpoints for backward compatibility

@router.get("/structure/{employee_id}", response_model=schemas.SalaryStructureOut)
def get_salary_structure_legacy(employee_id: int, db: Session = Depends(database.get_db)):
    """Legacy endpoint - get salary structure"""
    return get_salary_structure(employee_id, db, get_current_user())

@router.post("/calculate", response_model=List[schemas.PayrollOut])
def calculate_payroll_legacy(month: str, db: Session = Depends(database.get_db)):
    """Legacy endpoint - calculate payroll"""
    # This is kept for backward compatibility but should use the new endpoint
    payroll_service = PayrollService(db)
    result = payroll_service.bulk_calculate_payroll(month)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result["results"]

@router.get("/history/{employee_id}", response_model=List[schemas.PayrollOut])
def get_payroll_history_legacy(employee_id: int, db: Session = Depends(database.get_db)):
    """Legacy endpoint - get payroll history"""
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return db.query(models.Payroll).filter(models.Payroll.employee_id == employee_id).all()

@router.get("/revisions/{employee_id}", response_model=List[schemas.SalaryRevisionOut])
def get_salary_revisions_legacy(employee_id: int, db: Session = Depends(database.get_db)):
    """Legacy endpoint - get salary revisions"""
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    revisions = db.query(models.SalaryRevision).filter(models.SalaryRevision.employee_id == employee_id).all()
    
    if not revisions:
         rev = models.SalaryRevision(
             employee_id=employee_id,
             previous_ctc=800000,
             new_ctc=960000,
             reason="Annual Appraisal",
             revision_date=datetime.utcnow()
         )
         db.add(rev)
         db.commit()
         db.refresh(rev)
         return [rev]
    return revisions

@router.get("/payslip/{payroll_id}")
def generate_payslip_legacy(payroll_id: int, db: Session = Depends(database.get_db)):
    """Legacy endpoint - generate payslip"""
    payroll_service = PayrollService(db)
    result = payroll_service.generate_payslip_data(payroll_id)
    
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["error"])
    
    # Return in legacy format for backward compatibility
    payslip = result["payslip"]
    return {
        "company": "DHA HR Systems",
        "month": payslip["payroll_period"]["month"],
        "employee": payslip["employee"]["name"],
        "earnings": {
            "Basic Salary": payslip["earnings"]["basic_salary"],
            "Allowances": (
                payslip["earnings"]["hra"] + 
                payslip["earnings"]["transport_allowance"] +
                payslip["earnings"]["medical_allowance"] +
                payslip["earnings"]["special_allowance"] +
                payslip["earnings"]["other_allowances"]
            ),
            "Total Earnings": payslip["earnings"]["total"]
        },
        "deductions": {
            "PF": payslip["deductions"]["pf"],
            "Tax": payslip["deductions"]["income_tax"] + payslip["deductions"]["professional_tax"],
            "Other Deductions": (
                payslip["deductions"]["esi"] +
                payslip["deductions"]["loan_deduction"] +
                payslip["deductions"]["other_deductions"]
            ),
            "Total Deductions": payslip["deductions"]["total"]
        },
        "net_pay": payslip["summary"]["net_salary"]
    }
