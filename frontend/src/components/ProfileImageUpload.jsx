import { useState, useRef } from 'react';
import api from '../api/axios';

export default function ProfileImageUpload({ currentImage, onImageUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const startCamera = async () => {
    try {
      setCameraReady(false);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setCameraReady(true);
            resolve();
          };
        });
        
        setCameraActive(true);
      }
    } catch (err) {
      alert('Camera access denied. Please allow camera access or use file upload.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraReady(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) {
      alert('Camera not ready. Please wait.');
      return null;
    }
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(photoData);
    stopCamera();
    return photoData;
  };

  const handleCapture = () => {
    capturePhoto();
  };

  const handleUploadCaptured = async () => {
    if (!capturedImage) return;

    setUploading(true);
    try {
      const response = await api.post('/attendance/upload-profile-image', {
        image: capturedImage
      });
      
      if (response.data) {
        alert('Profile image updated successfully!');
        onImageUpdate && onImageUpdate(capturedImage);
        setCapturedImage(null);
      }
    } catch (error) {
      alert('Failed to upload image: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleRetakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      setUploading(true);
      try {
        const response = await api.post('/attendance/upload-profile-image', {
          image: e.target.result
        });
        
        if (response.data) {
          alert('Profile image updated successfully!');
          onImageUpdate && onImageUpdate(e.target.result);
        }
      } catch (error) {
        alert('Failed to upload image: ' + (error.response?.data?.detail || error.message));
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">📸 Profile Photo</h3>
      
      {/* Current Image */}
      {currentImage && !capturedImage && (
        <div className="mb-4 text-center">
          <img 
            src={currentImage} 
            alt="Profile" 
            className="w-32 h-32 rounded-full mx-auto border-4 border-gray-200"
          />
          <p className="text-sm text-gray-600 mt-2">Current profile photo</p>
        </div>
      )}

      {/* Captured Image Preview */}
      {capturedImage && (
        <div className="mb-4 text-center">
          <img 
            src={capturedImage} 
            alt="Captured" 
            className="w-32 h-32 rounded-full mx-auto border-4 border-green-200"
          />
          <p className="text-sm text-green-600 mt-2">📸 Photo captured!</p>
          <div className="flex space-x-3 mt-4">
            <button
              onClick={handleUploadCaptured}
              disabled={uploading}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {uploading ? 'Uploading...' : '✅ Save Photo'}
            </button>
            <button
              onClick={handleRetakePhoto}
              className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
            >
              🔄 Retake
            </button>
          </div>
        </div>
      )}

      {/* Camera Section */}
      {cameraActive && !capturedImage ? (
        <div className="mb-4">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              muted
              className="w-full h-64 object-cover"
            />
            <div className="absolute inset-0 border-4 border-blue-400 opacity-30 rounded-full w-48 h-48 m-auto pointer-events-none"></div>
            {cameraReady && (
              <div className="absolute top-4 right-4">
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center">
                  <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                  LIVE
                </span>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="flex space-x-3 mt-4">
            <button
              onClick={handleCapture}
              disabled={!cameraReady}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              📸 Capture Photo
            </button>
            <button
              onClick={stopCamera}
              className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : !capturedImage ? (
        <div className="space-y-3">
          <button
            onClick={startCamera}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
          >
            📷 Take Photo with Camera
          </button>
          
          <div className="text-center text-gray-500">or</div>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 font-semibold"
          >
            📁 Upload from Files
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      ) : null}

      <p className="text-xs text-gray-500 mt-3">
        This photo will be used for face recognition during attendance marking.
      </p>
    </div>
  );
}