"""
Face Recognition Utilities for Attendance System
Uses face_recognition library for face matching
"""
try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False
    print("WARNING: face_recognition library not installed. Face recognition features will be disabled.")
    print("To enable face recognition, run: pip install face-recognition opencv-python Pillow")

import numpy as np
import base64
from io import BytesIO
from PIL import Image
import os

def decode_base64_image(base64_string):
    """Decode base64 image string to PIL Image"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        image_data = base64.b64decode(base64_string)
        image = Image.open(BytesIO(image_data))
        return np.array(image)
    except Exception as e:
        print(f"Error decoding image: {e}")
        return None

def get_face_encoding(image_array):
    """Extract face encoding from image array"""
    if not FACE_RECOGNITION_AVAILABLE:
        return None, "Face recognition library not installed. Please install: pip install face-recognition"
    
    try:
        # Find all face locations in the image
        face_locations = face_recognition.face_locations(image_array)
        
        if len(face_locations) == 0:
            return None, "No face detected in image"
        
        if len(face_locations) > 1:
            return None, "Multiple faces detected. Please ensure only one person is in frame"
        
        # Get face encoding
        face_encodings = face_recognition.face_encodings(image_array, face_locations)
        
        if len(face_encodings) > 0:
            return face_encodings[0], None
        else:
            return None, "Could not extract face features"
            
    except Exception as e:
        return None, f"Error processing face: {str(e)}"

def compare_faces(profile_image_base64, attendance_image_base64, tolerance=0.6):
    """
    Compare two face images and return match result
    
    Args:
        profile_image_base64: Base64 encoded profile image
        attendance_image_base64: Base64 encoded attendance image
        tolerance: Face matching tolerance (lower = stricter, default 0.6)
    
    Returns:
        dict with match result and details
    """
    if not FACE_RECOGNITION_AVAILABLE:
        return {
            "match": False,
            "confidence": 0,
            "message": "Face recognition library not installed. Please install: pip install face-recognition opencv-python Pillow"
        }
    
    try:
        # Decode images
        profile_image = decode_base64_image(profile_image_base64)
        attendance_image = decode_base64_image(attendance_image_base64)
        
        if profile_image is None:
            return {
                "match": False,
                "confidence": 0,
                "message": "Failed to decode profile image"
            }
        
        if attendance_image is None:
            return {
                "match": False,
                "confidence": 0,
                "message": "Failed to decode attendance image"
            }
        
        # Get face encodings
        profile_encoding, profile_error = get_face_encoding(profile_image)
        if profile_error:
            return {
                "match": False,
                "confidence": 0,
                "message": f"Profile image error: {profile_error}"
            }
        
        attendance_encoding, attendance_error = get_face_encoding(attendance_image)
        if attendance_error:
            return {
                "match": False,
                "confidence": 0,
                "message": f"Attendance image error: {attendance_error}"
            }
        
        # Compare faces
        face_distance = face_recognition.face_distance([profile_encoding], attendance_encoding)[0]
        match = face_distance <= tolerance
        
        # Calculate confidence percentage (inverse of distance)
        confidence = max(0, min(100, (1 - face_distance) * 100))
        
        return {
            "match": match,
            "confidence": round(confidence, 2),
            "message": "Face matched successfully" if match else "Face does not match profile",
            "face_distance": round(face_distance, 4)
        }
        
    except Exception as e:
        return {
            "match": False,
            "confidence": 0,
            "message": f"Face recognition error: {str(e)}"
        }

def save_profile_image(employee_id, image_base64):
    """Save employee profile image for future face matching"""
    try:
        upload_dir = "uploads/profile_images"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Decode and save image
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        image_data = base64.b64decode(image_base64)
        file_path = os.path.join(upload_dir, f"employee_{employee_id}.jpg")
        
        with open(file_path, 'wb') as f:
            f.write(image_data)
        
        return file_path
    except Exception as e:
        print(f"Error saving profile image: {e}")
        return None

def load_profile_image(employee_id):
    """Load employee profile image as base64"""
    try:
        file_path = f"uploads/profile_images/employee_{employee_id}.jpg"
        
        if not os.path.exists(file_path):
            return None
        
        with open(file_path, 'rb') as f:
            image_data = f.read()
            return base64.b64encode(image_data).decode('utf-8')
    except Exception as e:
        print(f"Error loading profile image: {e}")
        return None
