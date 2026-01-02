"""
IT Provisioning Service
Handles automatic provisioning of IT resources during onboarding
"""

import secrets
import string
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from . import models
import hashlib
import json


class ITProvisioningService:
    def __init__(self, db: Session):
        self.db = db
    
    def provision_all_resources(
        self, 
        employee_id: int, 
        provision_email: bool = True,
        provision_vpn: bool = True,
        provision_access_card: bool = True,
        assign_assets: bool = True,
        access_level: str = "standard",
        building_access: List[str] = None,
        floor_access: List[int] = None
    ) -> Dict:
        """
        Provision all IT resources for an employee
        """
        employee = self.db.query(models.Employee).filter(models.Employee.id == employee_id).first()
        if not employee:
            return {"success": False, "message": "Employee not found"}
        
        results = {
            "success": True,
            "message": "IT resources provisioned successfully",
            "provisioned_resources": {},
            "failed_resources": [],
            "logs": []
        }
        
        # Default values
        if building_access is None:
            building_access = ["main_building"]
        if floor_access is None:
            floor_access = [1, 2]  # Ground floor and first floor by default
        
        # 1. Create company email
        if provision_email:
            try:
                email_result = self._create_company_email(employee)
                results["provisioned_resources"]["email"] = email_result
                self._log_action(employee_id, "email", email_result.get("id"), "created", "success")
            except Exception as e:
                results["failed_resources"].append(f"Email: {str(e)}")
                self._log_action(employee_id, "email", None, "created", "failed", str(e))
        
        # 2. Create VPN credentials
        if provision_vpn:
            try:
                vpn_result = self._create_vpn_credentials(employee)
                results["provisioned_resources"]["vpn"] = vpn_result
                self._log_action(employee_id, "vpn", vpn_result.get("id"), "created", "success")
            except Exception as e:
                results["failed_resources"].append(f"VPN: {str(e)}")
                self._log_action(employee_id, "vpn", None, "created", "failed", str(e))
        
        # 3. Create access card
        if provision_access_card:
            try:
                card_result = self._create_access_card(employee, access_level, building_access, floor_access)
                results["provisioned_resources"]["access_card"] = card_result
                self._log_action(employee_id, "access_card", card_result.get("id"), "created", "success")
            except Exception as e:
                results["failed_resources"].append(f"Access Card: {str(e)}")
                self._log_action(employee_id, "access_card", None, "created", "failed", str(e))
        
        # 4. Assign assets (laptop, monitor, etc.)
        if assign_assets:
            try:
                asset_results = self._assign_assets(employee)
                results["provisioned_resources"]["assets"] = asset_results
                for asset in asset_results:
                    self._log_action(employee_id, "asset", asset.get("id"), "assigned", "success")
            except Exception as e:
                results["failed_resources"].append(f"Assets: {str(e)}")
                self._log_action(employee_id, "asset", None, "assigned", "failed", str(e))
        
        # Check if any resources failed
        if results["failed_resources"]:
            results["success"] = False
            results["message"] = f"Some resources failed to provision: {', '.join(results['failed_resources'])}"
        
        return results
    
    def _create_company_email(self, employee: models.Employee) -> Dict:
        """Create company email address for employee"""
        # Generate email address
        base_email = f"{employee.first_name.lower()}.{employee.last_name.lower()}".replace(" ", "")
        domain = "@company.com"
        email_address = base_email + domain
        
        # Check if email already exists, add number if needed
        counter = 1
        original_email = email_address
        while self.db.query(models.EmployeeEmail).filter(models.EmployeeEmail.email_address == email_address).first():
            email_address = f"{base_email}{counter}{domain}"
            counter += 1
        
        # Generate secure password
        password = self._generate_secure_password()
        
        # Create email record
        employee_email = models.EmployeeEmail(
            employee_id=employee.id,
            email_address=email_address,
            password=self._hash_password(password),  # Store hashed password
            status="active"
        )
        
        self.db.add(employee_email)
        self.db.commit()
        self.db.refresh(employee_email)
        
        return {
            "id": employee_email.id,
            "email_address": email_address,
            "temporary_password": password,  # Return plain password for initial setup
            "status": "active"
        }
    
    def _create_vpn_credentials(self, employee: models.Employee) -> Dict:
        """Create VPN credentials for employee"""
        # Generate VPN username
        username = f"{employee.first_name.lower()}.{employee.last_name.lower()}".replace(" ", "")
        
        # Check if username exists, add number if needed
        counter = 1
        original_username = username
        while self.db.query(models.VPNCredential).filter(models.VPNCredential.username == username).first():
            username = f"{original_username}{counter}"
            counter += 1
        
        # Generate secure password
        password = self._generate_secure_password()
        
        # VPN server configuration
        server_config = {
            "server": "vpn.company.com",
            "port": 1194,
            "protocol": "OpenVPN",
            "encryption": "AES-256",
            "auth_method": "username_password"
        }
        
        # Create VPN credential record
        vpn_credential = models.VPNCredential(
            employee_id=employee.id,
            username=username,
            password=self._hash_password(password),
            server_config=server_config,
            status="active",
            expires_at=datetime.utcnow() + timedelta(days=365)  # 1 year expiry
        )
        
        self.db.add(vpn_credential)
        self.db.commit()
        self.db.refresh(vpn_credential)
        
        return {
            "id": vpn_credential.id,
            "username": username,
            "temporary_password": password,
            "server_config": server_config,
            "status": "active",
            "expires_at": vpn_credential.expires_at.isoformat()
        }
    
    def _create_access_card(
        self, 
        employee: models.Employee, 
        access_level: str,
        building_access: List[str],
        floor_access: List[int]
    ) -> Dict:
        """Create access card for employee"""
        # Generate unique card number
        card_number = self._generate_card_number()
        
        # Generate unique RFID tag
        rfid_tag = self._generate_rfid_tag()
        
        # Create access card record
        access_card = models.AccessCard(
            employee_id=employee.id,
            card_number=card_number,
            rfid_tag=rfid_tag,
            access_level=access_level,
            building_access=building_access,
            floor_access=floor_access,
            status="active",
            expiry_date=datetime.utcnow() + timedelta(days=365),  # 1 year expiry
            physical_delivery_status="pending"
        )
        
        self.db.add(access_card)
        self.db.commit()
        self.db.refresh(access_card)
        
        return {
            "id": access_card.id,
            "card_number": card_number,
            "rfid_tag": rfid_tag,
            "access_level": access_level,
            "building_access": building_access,
            "floor_access": floor_access,
            "status": "active",
            "physical_delivery_status": "pending"
        }
    
    def _assign_assets(self, employee: models.Employee) -> List[Dict]:
        """Assign available assets to employee"""
        assigned_assets = []
        
        # Define required asset types for new employee
        required_assets = ["Laptop", "Monitor", "Keyboard", "Mouse"]
        
        for asset_type in required_assets:
            # Find available asset of this type
            available_asset = self.db.query(models.Asset).filter(
                models.Asset.type == asset_type,
                models.Asset.status == "available"
            ).first()
            
            if available_asset:
                # Assign asset to employee
                available_asset.assigned_to = employee.id
                available_asset.status = "assigned"
                
                assigned_assets.append({
                    "id": available_asset.id,
                    "name": available_asset.name,
                    "type": available_asset.type,
                    "serial_number": available_asset.serial_number
                })
            else:
                # Create a new asset if none available (for demo purposes)
                new_asset = models.Asset(
                    name=f"{asset_type} for {employee.first_name} {employee.last_name}",
                    type=asset_type,
                    serial_number=self._generate_serial_number(asset_type),
                    assigned_to=employee.id,
                    status="assigned"
                )
                
                self.db.add(new_asset)
                self.db.flush()  # Get the ID
                
                assigned_assets.append({
                    "id": new_asset.id,
                    "name": new_asset.name,
                    "type": new_asset.type,
                    "serial_number": new_asset.serial_number
                })
        
        self.db.commit()
        return assigned_assets
    
    def _log_action(
        self, 
        employee_id: int, 
        resource_type: str, 
        resource_id: Optional[int], 
        action: str, 
        status: str,
        error_message: Optional[str] = None
    ):
        """Log IT provisioning action"""
        log_entry = models.ITProvisioningLog(
            employee_id=employee_id,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            status=status,
            error_message=error_message,
            created_by=1  # System user ID
        )
        
        self.db.add(log_entry)
        # Don't commit here, let the caller handle it
    
    def _generate_secure_password(self, length: int = 12) -> str:
        """Generate a secure random password"""
        characters = string.ascii_letters + string.digits + "!@#$%^&*"
        password = ''.join(secrets.choice(characters) for _ in range(length))
        return password
    
    def _hash_password(self, password: str) -> str:
        """Hash password for storage"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def _generate_card_number(self) -> str:
        """Generate unique card number"""
        # Format: COMP-YYYY-NNNN (e.g., COMP-2024-0001)
        year = datetime.now().year
        
        # Find the highest card number for this year
        latest_card = self.db.query(models.AccessCard).filter(
            models.AccessCard.card_number.like(f"COMP-{year}-%")
        ).order_by(models.AccessCard.card_number.desc()).first()
        
        if latest_card:
            # Extract number and increment
            last_number = int(latest_card.card_number.split('-')[-1])
            new_number = last_number + 1
        else:
            new_number = 1
        
        return f"COMP-{year}-{new_number:04d}"
    
    def _generate_rfid_tag(self) -> str:
        """Generate unique RFID tag"""
        # Generate 8-character hex string
        return ''.join(secrets.choice('0123456789ABCDEF') for _ in range(8))
    
    def _generate_serial_number(self, asset_type: str) -> str:
        """Generate serial number for asset"""
        prefix = asset_type[:3].upper()
        timestamp = datetime.now().strftime("%Y%m%d")
        random_suffix = ''.join(secrets.choice(string.digits) for _ in range(4))
        return f"{prefix}-{timestamp}-{random_suffix}"
    
    def get_employee_it_resources(self, employee_id: int) -> Dict:
        """Get all IT resources for an employee"""
        employee = self.db.query(models.Employee).filter(models.Employee.id == employee_id).first()
        if not employee:
            return {"error": "Employee not found"}
        
        # Get email
        email = self.db.query(models.EmployeeEmail).filter(
            models.EmployeeEmail.employee_id == employee_id
        ).first()
        
        # Get VPN credentials
        vpn = self.db.query(models.VPNCredential).filter(
            models.VPNCredential.employee_id == employee_id
        ).first()
        
        # Get access card
        access_card = self.db.query(models.AccessCard).filter(
            models.AccessCard.employee_id == employee_id
        ).first()
        
        # Get assigned assets
        assets = self.db.query(models.Asset).filter(
            models.Asset.assigned_to == employee_id
        ).all()
        
        return {
            "employee_id": employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "email": {
                "address": email.email_address if email else None,
                "status": email.status if email else None
            } if email else None,
            "vpn": {
                "username": vpn.username if vpn else None,
                "server": vpn.server_config.get("server") if vpn else None,
                "status": vpn.status if vpn else None,
                "expires_at": vpn.expires_at.isoformat() if vpn and vpn.expires_at else None
            } if vpn else None,
            "access_card": {
                "card_number": access_card.card_number if access_card else None,
                "access_level": access_card.access_level if access_card else None,
                "status": access_card.status if access_card else None,
                "delivery_status": access_card.physical_delivery_status if access_card else None
            } if access_card else None,
            "assets": [
                {
                    "id": asset.id,
                    "name": asset.name,
                    "type": asset.type,
                    "serial_number": asset.serial_number,
                    "status": asset.status
                } for asset in assets
            ]
        }