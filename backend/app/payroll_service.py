from sqlalchemy.orm import Session
from sqlalchemy import and_, func, extract
from typing import Dict, List, Optional, Any
from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP
import json
import logging
from app import models, schemas
from app.attendance_service import AttendanceService
from app.notification_service import NotificationService

logger = logging.getLogger(__name__)

class PayrollService:
    def __init__(self, db: Session):
        self.db = db
        self.attendance_service = AttendanceService(db)
        self.notification_service = NotificationService(db)

    def calculate_employee_payroll(
        self, 
        employee_id: int, 
        month: str, 
        manual_adjustments: Optional[Dict] = None,
        calculated_by: int = None
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive payroll for an employee for a given month
        """
        try:
            # Get employee details
            employee = self.db.query(models.Employee).filter(models.Employee.id == employee_id).first()
            if not employee:
                return {"success": False, "error": "Employee not found"}

            # Get salary structure
            salary_structure = self._get_active_salary_structure(employee_id, month)
            if not salary_structure:
                return {"success": False, "error": "No active salary structure found"}

            # Parse month (YYYY-MM format)
            year, month_num = map(int, month.split('-'))
            
            # Get working days and attendance data
            attendance_data = self._get_attendance_data(employee_id, year, month_num)
            
            # Calculate earnings
            earnings = self._calculate_earnings(salary_structure, attendance_data, manual_adjustments)
            
            # Calculate deductions
            deductions = self._calculate_deductions(earnings, salary_structure, manual_adjustments)
            
            # Calculate net salary
            gross_salary = sum(earnings.values())
            total_deductions = sum(deductions.values())
            net_salary = gross_salary - total_deductions

            # Create or update payroll record
            payroll_data = {
                "employee_id": employee_id,
                "month": month,
                "basic_salary": earnings.get("basic_salary", 0),
                "hra": earnings.get("hra", 0),
                "transport_allowance": earnings.get("transport_allowance", 0),
                "medical_allowance": earnings.get("medical_allowance", 0),
                "special_allowance": earnings.get("special_allowance", 0),
                "bonus": earnings.get("bonus", 0),
                "overtime_amount": earnings.get("overtime_amount", 0),
                "other_allowances": earnings.get("other_allowances", 0),
                "pf": deductions.get("pf", 0),
                "esi": deductions.get("esi", 0),
                "professional_tax": deductions.get("professional_tax", 0),
                "income_tax": deductions.get("income_tax", 0),
                "loan_deduction": deductions.get("loan_deduction", 0),
                "other_deductions": deductions.get("other_deductions", 0),
                "total_working_days": attendance_data["total_working_days"],
                "actual_working_days": attendance_data["actual_working_days"],
                "leave_days": attendance_data["leave_days"],
                "overtime_hours": attendance_data["overtime_hours"],
                "gross_salary": gross_salary,
                "total_deductions": total_deductions,
                "net_salary": net_salary,
                "status": "calculated",
                "calculated_by": calculated_by,
                "manual_adjustments": manual_adjustments or {},
                "calculation_notes": f"Calculated on {datetime.utcnow().isoformat()}"
            }

            # Check if payroll already exists
            existing_payroll = self.db.query(models.Payroll).filter(
                and_(models.Payroll.employee_id == employee_id, models.Payroll.month == month)
            ).first()

            if existing_payroll:
                # Update existing record
                for key, value in payroll_data.items():
                    setattr(existing_payroll, key, value)
                existing_payroll.updated_at = datetime.utcnow()
                payroll = existing_payroll
            else:
                # Create new record
                payroll = models.Payroll(**payroll_data)
                self.db.add(payroll)

            self.db.commit()
            self.db.refresh(payroll)

            return {
                "success": True,
                "payroll": payroll,
                "earnings": earnings,
                "deductions": deductions,
                "attendance_data": attendance_data
            }

        except Exception as e:
            logger.error(f"Error calculating payroll for employee {employee_id}: {str(e)}")
            self.db.rollback()
            return {"success": False, "error": str(e)}

    def _get_active_salary_structure(self, employee_id: int, month: str) -> Optional[models.SalaryStructure]:
        """Get the active salary structure for an employee for a given month"""
        month_date = datetime.strptime(f"{month}-01", "%Y-%m-%d").date()
        
        return self.db.query(models.SalaryStructure).filter(
            and_(
                models.SalaryStructure.employee_id == employee_id,
                models.SalaryStructure.effective_date <= month_date
            )
        ).order_by(models.SalaryStructure.effective_date.desc()).first()

    def _get_attendance_data(self, employee_id: int, year: int, month: int) -> Dict[str, Any]:
        """Get attendance data for payroll calculation"""
        try:
            # Get total working days in month (excluding weekends and holidays)
            total_working_days = self.attendance_service.get_working_days_in_month(year, month)
            
            # Get employee attendance records for the month
            attendance_records = self.db.query(models.Attendance).filter(
                and_(
                    models.Attendance.employee_id == employee_id,
                    extract('year', models.Attendance.date) == year,
                    extract('month', models.Attendance.date) == month
                )
            ).all()

            # Calculate actual working days and overtime
            actual_working_days = 0
            overtime_hours = 0.0
            
            for record in attendance_records:
                if record.status in ['present', 'half_day']:
                    if record.status == 'present':
                        actual_working_days += 1
                    else:  # half_day
                        actual_working_days += 0.5
                    
                    # Calculate overtime (assuming 8 hours standard work day)
                    if record.total_hours and record.total_hours > 8:
                        overtime_hours += record.total_hours - 8

            # Get leave days
            leave_days = self._get_leave_days(employee_id, year, month)
            
            return {
                "total_working_days": total_working_days,
                "actual_working_days": actual_working_days,
                "leave_days": leave_days,
                "overtime_hours": overtime_hours,
                "attendance_percentage": (actual_working_days / total_working_days * 100) if total_working_days > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"Error getting attendance data: {str(e)}")
            # Return default values if attendance data is not available
            return {
                "total_working_days": 22,  # Default working days
                "actual_working_days": 22,
                "leave_days": 0,
                "overtime_hours": 0.0,
                "attendance_percentage": 100.0
            }

    def _get_leave_days(self, employee_id: int, year: int, month: int) -> int:
        """Get leave days for an employee in a given month"""
        try:
            # This would integrate with leave management system
            # For now, return 0 as placeholder
            return 0
        except Exception:
            return 0

    def _calculate_earnings(
        self, 
        salary_structure: models.SalaryStructure, 
        attendance_data: Dict, 
        manual_adjustments: Optional[Dict] = None
    ) -> Dict[str, float]:
        """Calculate all earnings components"""
        manual_adjustments = manual_adjustments or {}
        
        # Calculate pro-rated salary based on attendance
        attendance_ratio = attendance_data["actual_working_days"] / attendance_data["total_working_days"]
        
        earnings = {
            "basic_salary": self._round_amount(salary_structure.basic_salary * attendance_ratio),
            "hra": self._round_amount(salary_structure.hra * attendance_ratio),
            "transport_allowance": self._round_amount(getattr(salary_structure, 'transport_allowance', 0) * attendance_ratio),
            "medical_allowance": self._round_amount(getattr(salary_structure, 'medical_allowance', 0) * attendance_ratio),
            "special_allowance": self._round_amount(getattr(salary_structure, 'special_allowance', 0) * attendance_ratio),
            "other_allowances": self._round_amount(salary_structure.other_allowances * attendance_ratio),
            "bonus": 0.0,  # Bonus is typically not pro-rated
            "overtime_amount": self._calculate_overtime_amount(salary_structure, attendance_data["overtime_hours"])
        }

        # Apply manual adjustments
        for component, adjustment in manual_adjustments.get("earnings", {}).items():
            if component in earnings:
                earnings[component] = self._round_amount(earnings[component] + adjustment)

        return earnings

    def _calculate_overtime_amount(self, salary_structure: models.SalaryStructure, overtime_hours: float) -> float:
        """Calculate overtime amount"""
        if overtime_hours <= 0:
            return 0.0
        
        # Calculate hourly rate (basic salary / (22 days * 8 hours))
        hourly_rate = salary_structure.basic_salary / (22 * 8)
        # Overtime rate is typically 1.5x or 2x the hourly rate
        overtime_rate = hourly_rate * 1.5
        
        return self._round_amount(overtime_hours * overtime_rate)

    def _calculate_deductions(
        self, 
        earnings: Dict[str, float], 
        salary_structure: models.SalaryStructure,
        manual_adjustments: Optional[Dict] = None
    ) -> Dict[str, float]:
        """Calculate all deduction components"""
        manual_adjustments = manual_adjustments or {}
        
        basic_salary = earnings["basic_salary"]
        gross_salary = sum(earnings.values())
        
        deductions = {
            "pf": self._calculate_pf(basic_salary),
            "esi": self._calculate_esi(gross_salary),
            "professional_tax": self._calculate_professional_tax(gross_salary),
            "income_tax": self._calculate_income_tax(gross_salary),
            "loan_deduction": 0.0,  # This would come from loan management system
            "other_deductions": 0.0
        }

        # Apply manual adjustments
        for component, adjustment in manual_adjustments.get("deductions", {}).items():
            if component in deductions:
                deductions[component] = self._round_amount(deductions[component] + adjustment)

        return deductions

    def _calculate_pf(self, basic_salary: float) -> float:
        """Calculate Provident Fund (12% of basic salary, capped at 15000)"""
        pf_eligible_salary = min(basic_salary, 15000)  # PF ceiling
        return self._round_amount(pf_eligible_salary * 0.12)

    def _calculate_esi(self, gross_salary: float) -> float:
        """Calculate ESI (0.75% of gross salary, applicable if gross <= 25000)"""
        if gross_salary <= 25000:
            return self._round_amount(gross_salary * 0.0075)
        return 0.0

    def _calculate_professional_tax(self, gross_salary: float) -> float:
        """Calculate Professional Tax (state-specific, using Karnataka rates as example)"""
        monthly_gross = gross_salary
        
        if monthly_gross <= 15000:
            return 0.0
        elif monthly_gross <= 20000:
            return 150.0
        else:
            return 200.0

    def _calculate_income_tax(self, gross_salary: float) -> float:
        """Calculate Income Tax (simplified calculation)"""
        annual_gross = gross_salary * 12
        
        # Standard deduction
        taxable_income = max(0, annual_gross - 50000)  # 50k standard deduction
        
        # Tax slabs (old regime for simplicity)
        tax = 0.0
        if taxable_income > 250000:
            if taxable_income <= 500000:
                tax = (taxable_income - 250000) * 0.05
            elif taxable_income <= 1000000:
                tax = 12500 + (taxable_income - 500000) * 0.20
            else:
                tax = 112500 + (taxable_income - 1000000) * 0.30
        
        # Monthly tax
        monthly_tax = tax / 12
        return self._round_amount(monthly_tax)

    def _round_amount(self, amount: float) -> float:
        """Round amount to 2 decimal places"""
        return float(Decimal(str(amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

    def bulk_calculate_payroll(
        self, 
        month: str, 
        employee_ids: Optional[List[int]] = None,
        calculated_by: int = None
    ) -> Dict[str, Any]:
        """Calculate payroll for multiple employees"""
        try:
            if employee_ids is None:
                # Get all active employees
                employees = self.db.query(models.Employee).filter(models.Employee.status == 'active').all()
                employee_ids = [emp.id for emp in employees]

            results = []
            errors = []

            for emp_id in employee_ids:
                result = self.calculate_employee_payroll(emp_id, month, calculated_by=calculated_by)
                if result["success"]:
                    results.append(result["payroll"])
                else:
                    errors.append({"employee_id": emp_id, "error": result["error"]})

            return {
                "success": True,
                "processed_count": len(results),
                "error_count": len(errors),
                "results": results,
                "errors": errors
            }

        except Exception as e:
            logger.error(f"Error in bulk payroll calculation: {str(e)}")
            return {"success": False, "error": str(e)}

    def approve_payroll(self, payroll_id: int, approved_by: int) -> Dict[str, Any]:
        """Approve a payroll record"""
        try:
            payroll = self.db.query(models.Payroll).filter(models.Payroll.id == payroll_id).first()
            if not payroll:
                return {"success": False, "error": "Payroll record not found"}

            if payroll.status != "calculated":
                return {"success": False, "error": f"Cannot approve payroll with status: {payroll.status}"}

            payroll.status = "approved"
            payroll.approved_by = approved_by
            payroll.updated_at = datetime.utcnow()

            self.db.commit()

            # Send notification to employee
            self._send_payroll_notification(payroll, "approved")

            return {"success": True, "payroll": payroll}

        except Exception as e:
            logger.error(f"Error approving payroll {payroll_id}: {str(e)}")
            self.db.rollback()
            return {"success": False, "error": str(e)}

    def generate_payslip_data(self, payroll_id: int) -> Dict[str, Any]:
        """Generate comprehensive payslip data"""
        try:
            payroll = self.db.query(models.Payroll).filter(models.Payroll.id == payroll_id).first()
            if not payroll:
                return {"success": False, "error": "Payroll record not found"}

            employee = payroll.employee
            
            # Calculate totals
            total_earnings = (
                payroll.basic_salary + payroll.hra + payroll.transport_allowance +
                payroll.medical_allowance + payroll.special_allowance + payroll.bonus +
                payroll.overtime_amount + payroll.other_allowances
            )
            
            total_deductions = (
                payroll.pf + payroll.esi + payroll.professional_tax +
                payroll.income_tax + payroll.loan_deduction + payroll.other_deductions
            )

            payslip_data = {
                "payroll_id": payroll.id,
                "employee": {
                    "id": employee.id,
                    "name": f"{employee.first_name} {employee.last_name}",
                    "employee_code": getattr(employee, 'employee_code', f"EMP{employee.id:04d}"),
                    "designation": getattr(employee, 'designation', 'N/A'),
                    "department": getattr(employee, 'department', 'N/A'),
                    "joining_date": getattr(employee, 'joining_date', None)
                },
                "payroll_period": {
                    "month": payroll.month,
                    "total_working_days": payroll.total_working_days,
                    "actual_working_days": payroll.actual_working_days,
                    "leave_days": payroll.leave_days,
                    "overtime_hours": payroll.overtime_hours
                },
                "earnings": {
                    "basic_salary": payroll.basic_salary,
                    "hra": payroll.hra,
                    "transport_allowance": payroll.transport_allowance,
                    "medical_allowance": payroll.medical_allowance,
                    "special_allowance": payroll.special_allowance,
                    "bonus": payroll.bonus,
                    "overtime_amount": payroll.overtime_amount,
                    "other_allowances": payroll.other_allowances,
                    "total": total_earnings
                },
                "deductions": {
                    "pf": payroll.pf,
                    "esi": payroll.esi,
                    "professional_tax": payroll.professional_tax,
                    "income_tax": payroll.income_tax,
                    "loan_deduction": payroll.loan_deduction,
                    "other_deductions": payroll.other_deductions,
                    "total": total_deductions
                },
                "summary": {
                    "gross_salary": payroll.gross_salary,
                    "total_deductions": payroll.total_deductions,
                    "net_salary": payroll.net_salary
                },
                "status": payroll.status,
                "generated_on": datetime.utcnow().isoformat(),
                "manual_adjustments": payroll.manual_adjustments
            }

            return {"success": True, "payslip": payslip_data}

        except Exception as e:
            logger.error(f"Error generating payslip data: {str(e)}")
            return {"success": False, "error": str(e)}

    def _send_payroll_notification(self, payroll: models.Payroll, action: str):
        """Send payroll-related notifications"""
        try:
            employee = payroll.employee
            if action == "approved":
                message = f"Your payslip for {payroll.month} has been approved and is ready for download."
                self.notification_service.create_notification(
                    user_id=employee.user_id if hasattr(employee, 'user_id') else None,
                    title="Payslip Ready",
                    message=message,
                    notification_type="payroll",
                    priority="medium"
                )
        except Exception as e:
            logger.error(f"Error sending payroll notification: {str(e)}")

    def get_payroll_summary(self, month: str) -> Dict[str, Any]:
        """Get payroll summary for a month"""
        try:
            payrolls = self.db.query(models.Payroll).filter(models.Payroll.month == month).all()
            
            summary = {
                "month": month,
                "total_employees": len(payrolls),
                "total_gross_salary": sum(p.gross_salary for p in payrolls),
                "total_deductions": sum(p.total_deductions for p in payrolls),
                "total_net_salary": sum(p.net_salary for p in payrolls),
                "status_breakdown": {},
                "component_breakdown": {
                    "basic_salary": sum(p.basic_salary for p in payrolls),
                    "hra": sum(p.hra for p in payrolls),
                    "allowances": sum(p.transport_allowance + p.medical_allowance + p.special_allowance + p.other_allowances for p in payrolls),
                    "pf": sum(p.pf for p in payrolls),
                    "esi": sum(p.esi for p in payrolls),
                    "tax": sum(p.professional_tax + p.income_tax for p in payrolls)
                }
            }

            # Status breakdown
            for payroll in payrolls:
                status = payroll.status
                summary["status_breakdown"][status] = summary["status_breakdown"].get(status, 0) + 1

            return {"success": True, "summary": summary}

        except Exception as e:
            logger.error(f"Error getting payroll summary: {str(e)}")
            return {"success": False, "error": str(e)}