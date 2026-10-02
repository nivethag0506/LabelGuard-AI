import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, Camera, Image as ImageIcon, X, RefreshCw, Sparkles, Check, AlertCircle } from 'lucide-react';
import './UploadZone.css';

export default function UploadZone({ onFileSelected }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndPassFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndPassFile(e.target.files[0]);
    }
  };

  const validateAndPassFile = (file) => {
    if (!file) return;
    const isImage = (file.type && file.type.startsWith('image/')) || /\.(jpe?g|png|webp|bmp|gif|jfif|heic|tiff?)$/i.test(file.name);
    if (!isImage) {
      alert('Please select a valid image file (JPG, PNG, or WEBP).');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      alert('Image size exceeds 25MB limit. Please upload a smaller image.');
      return;
    }
    onFileSelected(file);
  };

  const [facingMode, setFacingMode] = useState('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Check if device has multiple cameras
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          if (videoInputs.length > 1) {
            setHasMultipleCameras(true);
          }
        })
        .catch(() => {});
    }
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCameraStream = async (mode = facingMode) => {
    setCameraError('');
    setIsCameraOpen(true);
    stopCameraStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Live camera is not supported in this browser. Please select an image directly.');
      return;
    }

    let stream = null;
    // Attempt 1: Desired facing mode with 1280x720 ideal
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        }
      });
    } catch (e1) {
      console.warn('[Camera] Attempt 1 failed:', e1.message);
      // Attempt 2: Desired facing mode only
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode }
        });
      } catch (e2) {
        console.warn('[Camera] Attempt 2 failed:', e2.message);
        // Attempt 3: Any video device
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (e3) {
          console.error('[Camera] All attempts failed:', e3.message);
          setCameraError(
            e3.name === 'NotAllowedError' || e3.name === 'PermissionDeniedError'
              ? 'Camera permission was denied. Please allow camera access in your browser or select an image file.'
              : 'Could not access webcam device. Please check your camera connection or upload an image file.'
          );
          return;
        }
      }
    }

    if (stream) {
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    }
  };

  // Ensure stream attaches when modal renders
  useEffect(() => {
    if (isCameraOpen && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraOpen]);

  const handleStartCamera = () => {
    startCameraStream(facingMode);
  };

  const handleToggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCameraStream(nextMode);
  };

  const handleCloseCamera = () => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCameraError('');
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Canvas capture returned null blob');
        }
        const file = new File([blob], `label-capture-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });

        stopCameraStream();
        setIsCameraOpen(false);
        setIsCapturing(false);
        validateAndPassFile(file);
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error('[Capture Error]:', err);
      setIsCapturing(false);
      alert('Photo capture failed: ' + err.message);
    }
  };

  return (
    <>
      <div
        className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleInputChange}
          accept="image/jpeg,image/png,image/webp,image/jpg"
          style={{ display: 'none' }}
        />

        {/* Dedicated Camera Input for Mobile Fallback */}
        <input
          type="file"
          ref={cameraInputRef}
          onChange={handleInputChange}
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
        />

        <div className="upload-content">
          <div className="upload-icon-circle">
            <UploadCloud size={36} className="upload-main-icon" />
          </div>

          <div className="upload-headings">
            <h3 className="upload-title">Upload Package Label Image</h3>
            <p className="upload-desc">
              Drag & drop label photo here, or use live camera capture
            </p>
          </div>

          <div className="upload-action-buttons">
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon size={18} />
              <span>Select Image</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-md live-camera-btn"
              onClick={handleStartCamera}
            >
              <Camera size={18} />
              <span>Take Photo</span>
            </button>
          </div>

          <div className="upload-footer-tags">
            <span className="upload-format-tag">Supported: JPG, PNG, WEBP</span>
            <span className="upload-format-tag">Max: 25MB</span>
            <span className="upload-format-tag">High-resolution & good lighting recommended</span>
          </div>
        </div>
      </div>

      {/* Live WebCam Viewfinder Modal */}
      {isCameraOpen && (
        <div className="live-camera-modal-overlay" role="dialog" aria-modal="true">
          <div className="live-camera-modal">
            <div className="camera-modal-header">
              <div className="camera-modal-title">
                <Camera size={18} className="camera-title-icon" />
                <span>Live Package Label Camera</span>
              </div>
              <div className="camera-header-controls">
                <button
                  type="button"
                  className="btn btn-secondary btn-xs camera-flip-btn"
                  onClick={handleToggleCamera}
                  title="Switch between front and back camera"
                >
                  <RefreshCw size={13} />
                  <span>Switch Camera</span>
                </button>
                <button
                  type="button"
                  className="camera-close-btn"
                  onClick={handleCloseCamera}
                  aria-label="Close Camera"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {cameraError ? (
              <div className="camera-error-container" style={{ padding: '28px 20px', textAlign: 'center' }}>
                <div style={{ color: '#ef4444', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
                  <AlertCircle size={44} />
                </div>
                <h4 style={{ color: '#f8fafc', marginBottom: '8px', fontSize: '1.05rem' }}>Camera Access Required</h4>
                <p style={{ color: '#94a3b8', fontSize: '0.88rem', maxWidth: '380px', margin: '0 auto 20px' }}>
                  {cameraError}
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-md"
                    onClick={() => {
                      handleCloseCamera();
                      setTimeout(() => fileInputRef.current?.click(), 150);
                    }}
                  >
                    <ImageIcon size={16} />
                    <span>Choose Photo From Device</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-md"
                    onClick={() => startCameraStream(facingMode)}
                  >
                    <RefreshCw size={16} />
                    <span>Retry Camera</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="camera-viewfinder-frame">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="camera-video-stream"
                  />

                  {/* Viewfinder Target Overlay */}
                  <div className="viewfinder-target-box">
                    <div className="viewfinder-corner top-left" />
                    <div className="viewfinder-corner top-right" />
                    <div className="viewfinder-corner bottom-left" />
                    <div className="viewfinder-corner bottom-right" />
                    <div className="viewfinder-guide-text">
                      Position statutory declaration panel inside this frame
                    </div>
                  </div>
                </div>

                <div className="camera-modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleCloseCamera}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="btn btn-accent btn-lg capture-shutter-btn"
                    onClick={handleCapturePhoto}
                    disabled={isCapturing}
                  >
                    <div className="shutter-inner-circle" />
                    <span>{isCapturing ? 'Processing...' : 'Capture Photo'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
