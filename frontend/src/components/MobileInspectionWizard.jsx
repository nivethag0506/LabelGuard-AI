import React, { useState, useRef } from 'react';
import { api } from '../services/api';
import './MobileInspectionWizard.css';

const VIEW_TYPE_OPTIONS = [
  { value: 'TOP', label: 'TOP — OPTIONAL' },
  { value: 'BOTTOM', label: 'BOTTOM — OPTIONAL' },
  { value: 'LEFT', label: 'LEFT — OPTIONAL' },
  { value: 'RIGHT', label: 'RIGHT — OPTIONAL' },
  { value: 'CLOSEUP_MRP', label: 'CLOSE-UP (MRP & TAXES)' },
  { value: 'CLOSEUP_LABEL', label: 'CLOSE-UP (STATUTORY DECLARATIONS)' },
  { value: 'CLOSEUP_MFG', label: 'CLOSE-UP (MANUFACTURER / ADDRESS)' },
  { value: 'CLOSEUP_BARCODE', label: 'CLOSE-UP (BARCODE / BATCH / DATE)' },
  { value: 'OTHER', label: 'OTHER / ADDITIONAL VIEW' }
];

export const MobileInspectionWizard = ({ onInspectionSubmit, isSubmitting = false }) => {
  // 1. Minimum Required Views: Front & Back
  const [requiredViews, setRequiredViews] = useState({
    front: { file: null, preview: '', quality: 'GOOD' },
    back: { file: null, preview: '', quality: 'GOOD' }
  });

  // 2. Optional Unlimited Additional Views
  const [additionalViews, setAdditionalViews] = useState([]);

  // 3. Optional Supplementary Video & Live Photos
  const [videoFile, setVideoFile] = useState(null);
  const [videoFrames, setVideoFrames] = useState([]);
  const [livePhotos, setLivePhotos] = useState([]);

  // Modals & Camera Viewfinder
  const [activeCameraTarget, setActiveCameraTarget] = useState(null); // 'front' | 'back' | additionalViewId
  const [cameraStream, setCameraStream] = useState(null);
  const [qualityWarning, setQualityWarning] = useState(null); // { target, file, preview, reasons }
  const [isCheckingQuality, setIsCheckingQuality] = useState(false);

  // Hidden File Inputs
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const activeInputTargetRef = useRef(null);
  const videoInputRef = useRef(null);
  const videoStreamRef = useRef(null);

  // Trigger file input for a specific target view
  const triggerGalleryUpload = (targetId) => {
    activeInputTargetRef.current = targetId;
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
      galleryInputRef.current.click();
    }
  };

  const triggerCameraCapture = (targetId) => {
    activeInputTargetRef.current = targetId;
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
      cameraInputRef.current.click();
    }
  };

  // Evaluate image quality before committing
  const handleSelectedFile = async (file, targetId) => {
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setIsCheckingQuality(true);

    try {
      const qcRes = await api.checkImageQuality(file);
      const qcData = qcRes.data || {};

      if (!qcData.isAcceptable && qcData.reasons && qcData.reasons.length > 0) {
        setQualityWarning({
          target: targetId,
          file,
          preview: previewUrl,
          reasons: qcData.reasons
        });
      } else {
        commitImageToView(targetId, file, previewUrl, 'GOOD');
      }
    } catch (err) {
      console.warn('[QualityCheck Error]:', err.message);
      commitImageToView(targetId, file, previewUrl, 'GOOD');
    } finally {
      setIsCheckingQuality(false);
    }
  };

  const commitImageToView = (targetId, file, previewUrl, qualityLevel) => {
    if (targetId === 'front' || targetId === 'back') {
      setRequiredViews(prev => ({
        ...prev,
        [targetId]: { file, preview: previewUrl, quality: qualityLevel }
      }));
    } else {
      // Additional view item
      setAdditionalViews(prev => prev.map(v => {
        if (v.id === targetId) {
          return { ...v, file, preview: previewUrl, quality: qualityLevel };
        }
        return v;
      }));
    }
    setQualityWarning(null);
  };

  const handleRetakeWarning = () => {
    setQualityWarning(null);
  };

  const handleUseAnywayWarning = () => {
    if (qualityWarning) {
      commitImageToView(
        qualityWarning.target,
        qualityWarning.file,
        qualityWarning.preview,
        'LOW QUALITY'
      );
    }
  };

  // HTML5 Live Camera Viewfinder
  const startLiveCamera = async (targetId) => {
    setActiveCameraTarget(targetId);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false
      });
      setCameraStream(stream);
      if (videoStreamRef.current) {
        videoStreamRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('[Camera Stream Error]: falling back to native file input', err.message);
      triggerCameraCapture(targetId);
      setActiveCameraTarget(null);
    }
  };

  const captureStreamSnapshot = () => {
    if (!videoStreamRef.current || !activeCameraTarget) return;
    const video = videoStreamRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${activeCameraTarget}-capture.jpg`, { type: 'image/jpeg' });
        const target = activeCameraTarget;
        stopCamera();
        handleSelectedFile(file, target);
      }
    }, 'image/jpeg', 0.95);
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setActiveCameraTarget(null);
  };

  // Additional Views Management
  const addAdditionalView = (presetType = 'OTHER') => {
    const newId = `add_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const presetObj = VIEW_TYPE_OPTIONS.find(o => o.value === presetType) || VIEW_TYPE_OPTIONS[8];
    const newView = {
      id: newId,
      viewType: presetType,
      label: presetObj.label,
      file: null,
      preview: '',
      quality: 'GOOD'
    };
    setAdditionalViews(prev => [...prev, newView]);
  };

  const removeAdditionalView = (id) => {
    setAdditionalViews(prev => prev.filter(v => v.id !== id));
  };

  const changeViewType = (id, newType) => {
    const presetObj = VIEW_TYPE_OPTIONS.find(o => o.value === newType) || VIEW_TYPE_OPTIONS[8];
    setAdditionalViews(prev => prev.map(v => {
      if (v.id === id) {
        return { ...v, viewType: newType, label: presetObj.label };
      }
      return v;
    }));
  };

  // Optional Video Sampling (extract 5 frames)
  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoFile(file);
    const videoUrl = URL.createObjectURL(file);
    const videoEl = document.createElement('video');
    videoEl.src = videoUrl;
    videoEl.muted = true;
    videoEl.playsInline = true;

    videoEl.onloadedmetadata = async () => {
      const duration = videoEl.duration || 1;
      const samplePoints = [0, 0.25, 0.5, 0.75, 0.95];
      const sampledBlobs = [];

      for (const ratio of samplePoints) {
        videoEl.currentTime = ratio * duration;
        await new Promise(resolve => {
          videoEl.onseeked = resolve;
        });

        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth || 640;
        canvas.height = videoEl.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

        await new Promise(resolve => {
          canvas.toBlob(blob => {
            if (blob) {
              sampledBlobs.push(new File([blob], `frame-${Math.round(ratio * 100)}.png`, { type: 'image/png' }));
            }
            resolve();
          }, 'image/png');
        });
      }

      setVideoFrames(sampledBlobs);
      console.log(`[Video Sampling] Extracted ${sampledBlobs.length} keyframes from uploaded video.`);
    };
  };

  // Submit complete inspection
  const handleSubmit = () => {
    if (!hasFront || !hasBack || isSubmitting) return;

    const viewsPayload = {
      front: requiredViews.front.file,
      back: requiredViews.back.file,
      top: additionalViews.find(v => v.viewType === 'TOP')?.file || null,
      bottom: additionalViews.find(v => v.viewType === 'BOTTOM')?.file || null,
      left: additionalViews.find(v => v.viewType === 'LEFT')?.file || null,
      right: additionalViews.find(v => v.viewType === 'RIGHT')?.file || null,
    };

    if (onInspectionSubmit) {
      onInspectionSubmit({
        views: viewsPayload,
        additionalViews: additionalViews.filter(v => v.file).map((v) => ({
          id: v.id,
          file: v.file,
          viewType: v.viewType,
          label: v.label
        })),
        livePhotos,
        video: videoFile,
        videoFrames
      });
    }
  };

  // State calculations
  const hasFront = Boolean(requiredViews.front.file);
  const hasBack = Boolean(requiredViews.back.file);
  const requiredCount = (hasFront ? 1 : 0) + (hasBack ? 1 : 0);
  const additionalWithFiles = additionalViews.filter(v => v.file);
  const totalViewsCount = requiredCount + additionalWithFiles.length;
  const canAnalyze = hasFront && hasBack;

  return (
    <div className="mobile-wizard-container">
      {/* Top Protocol Guidance Banner */}
      <div className="flexible-guidance-banner">
        <div className="guidance-main-msg">
          <strong>Front & Back views are required.</strong> You can add additional views if needed.
        </div>
        <div className="guidance-meta-row">
          <span className="badge-required-views">
            REQUIRED: {requiredCount}/2 complete {hasFront && hasBack ? '✓' : ''}
          </span>
          <span className="badge-additional-views">
            ADDITIONAL EVIDENCE: {additionalWithFiles.length} view{additionalWithFiles.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden-input"
        onChange={(e) => {
          if (activeInputTargetRef.current && e.target.files?.[0]) {
            handleSelectedFile(e.target.files[0], activeInputTargetRef.current);
          }
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden-input"
        onChange={(e) => {
          if (activeInputTargetRef.current && e.target.files?.[0]) {
            handleSelectedFile(e.target.files[0], activeInputTargetRef.current);
          }
        }}
      />

      {/* ========================================================================= */}
      {/* 1. REQUIRED VIEWS SECTION */}
      {/* ========================================================================= */}
      <div className="wizard-section-box">
        <div className="section-box-header">
          <div className="section-box-title">
            <span className="title-icon">📌</span>
            <h3>REQUIRED VIEWS (2/2)</h3>
          </div>
          <span className="section-pill required-pill">
            {requiredCount === 2 ? '✓ All Required Uploaded' : `${requiredCount}/2 Uploaded`}
          </span>
        </div>

        <div className="required-views-grid">
          {/* FRONT VIEW CARD */}
          <div className={`view-capture-card ${hasFront ? 'captured' : 'empty'}`}>
            <div className="card-header-bar">
              <span className="view-name-badge">
                FRONT {hasFront ? '✓ REQUIRED' : '• REQUIRED'}
              </span>
              {hasFront && (
                <span className={`quality-badge ${requiredViews.front.quality === 'GOOD' ? 'good' : 'warning'}`}>
                  {requiredViews.front.quality === 'GOOD' ? '✓ ACCEPTED' : '⚠ LOW QUALITY'}
                </span>
              )}
            </div>

            <div className="card-media-area">
              {hasFront ? (
                <div className="preview-media-box">
                  <img src={requiredViews.front.preview} alt="Front View" className="captured-preview-img" />
                </div>
              ) : (
                <div className="framing-placeholder-box">
                  <div className="framing-overlay-box mini">
                    <div className="framing-corner top-left"></div>
                    <div className="framing-corner top-right"></div>
                    <div className="framing-corner bottom-left"></div>
                    <div className="framing-corner bottom-right"></div>
                    <span className="framing-box-label">FRONT SURFACE</span>
                  </div>
                  <p className="framing-hint">Brand name, generic name, net quantity declaration.</p>
                </div>
              )}
            </div>

            <div className="card-actions-bar">
              <button
                type="button"
                className="btn-capture-action"
                onClick={() => startLiveCamera('front')}
                disabled={isCheckingQuality || isSubmitting}
              >
                📷 {hasFront ? 'Retake Photo' : 'Take Photo'}
              </button>
              <button
                type="button"
                className="btn-upload-action"
                onClick={() => triggerGalleryUpload('front')}
                disabled={isCheckingQuality || isSubmitting}
              >
                🖼 {hasFront ? 'Replace Image' : 'Upload Image'}
              </button>
            </div>
          </div>

          {/* BACK VIEW CARD */}
          <div className={`view-capture-card ${hasBack ? 'captured' : 'empty'}`}>
            <div className="card-header-bar">
              <span className="view-name-badge">
                BACK {hasBack ? '✓ REQUIRED' : '• REQUIRED'}
              </span>
              {hasBack && (
                <span className={`quality-badge ${requiredViews.back.quality === 'GOOD' ? 'good' : 'warning'}`}>
                  {requiredViews.back.quality === 'GOOD' ? '✓ ACCEPTED' : '⚠ LOW QUALITY'}
                </span>
              )}
            </div>

            <div className="card-media-area">
              {hasBack ? (
                <div className="preview-media-box">
                  <img src={requiredViews.back.preview} alt="Back View" className="captured-preview-img" />
                </div>
              ) : (
                <div className="framing-placeholder-box">
                  <div className="framing-overlay-box mini">
                    <div className="framing-corner top-left"></div>
                    <div className="framing-corner top-right"></div>
                    <div className="framing-corner bottom-left"></div>
                    <div className="framing-corner bottom-right"></div>
                    <span className="framing-box-label">BACK SURFACE</span>
                  </div>
                  <p className="framing-hint">Manufacturer, address, MRP, consumer care declarations.</p>
                </div>
              )}
            </div>

            <div className="card-actions-bar">
              <button
                type="button"
                className="btn-capture-action"
                onClick={() => startLiveCamera('back')}
                disabled={isCheckingQuality || isSubmitting}
              >
                📷 {hasBack ? 'Retake Photo' : 'Take Photo'}
              </button>
              <button
                type="button"
                className="btn-upload-action"
                onClick={() => triggerGalleryUpload('back')}
                disabled={isCheckingQuality || isSubmitting}
              >
                🖼 {hasBack ? 'Replace Image' : 'Upload Image'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ADDITIONAL VIEWS (OPTIONAL) SECTION */}
      {/* ========================================================================= */}
      <div className="wizard-section-box">
        <div className="section-box-header">
          <div className="section-box-title">
            <span className="title-icon">➕</span>
            <h3>ADDITIONAL PRODUCT VIEWS (OPTIONAL)</h3>
          </div>
          <span className="section-pill optional-pill">
            {additionalWithFiles.length} Added
          </span>
        </div>

        <p className="section-desc-note">
          Optional additional views improve statutory evidence (e.g. batch coding, seal integrity, MRP close-up).
        </p>

        {/* Quick Add Presets Bar */}
        <div className="quick-presets-bar">
          <span className="presets-label">Quick Add:</span>
          <button type="button" className="btn-preset" onClick={() => addAdditionalView('TOP')}>
            + Top
          </button>
          <button type="button" className="btn-preset" onClick={() => addAdditionalView('BOTTOM')}>
            + Bottom
          </button>
          <button type="button" className="btn-preset" onClick={() => addAdditionalView('LEFT')}>
            + Left
          </button>
          <button type="button" className="btn-preset" onClick={() => addAdditionalView('RIGHT')}>
            + Right
          </button>
          <button type="button" className="btn-preset" onClick={() => addAdditionalView('CLOSEUP_MRP')}>
            + Close-up MRP
          </button>
          <button type="button" className="btn-preset" onClick={() => addAdditionalView('CLOSEUP_LABEL')}>
            + Close-up Label
          </button>
        </div>

        {/* List of Added Additional Views */}
        {additionalViews.length > 0 && (
          <div className="additional-views-list">
            {additionalViews.map((item, idx) => {
              const hasFile = Boolean(item.file);
              return (
                <div key={item.id} className={`additional-view-item ${hasFile ? 'has-media' : 'pending'}`}>
                  <div className="item-header-row">
                    <div className="item-type-select-wrap">
                      <span className="item-number">#{idx + 1}</span>
                      <select
                        className="select-view-type"
                        value={item.viewType}
                        onChange={(e) => changeViewType(item.id, e.target.value)}
                      >
                        {VIEW_TYPE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="item-status-actions">
                      {hasFile && (
                        <span className={`quality-badge mini ${item.quality === 'GOOD' ? 'good' : 'warning'}`}>
                          {item.quality === 'GOOD' ? '✓ ACCEPTED' : '⚠ LOW'}
                        </span>
                      )}
                      <button
                        type="button"
                        className="btn-remove-view"
                        onClick={() => removeAdditionalView(item.id)}
                        title="Remove this additional view"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  </div>

                  <div className="item-body-row">
                    {hasFile ? (
                      <div className="item-preview-wrap">
                        <img src={item.preview} alt={item.label} className="item-preview-thumb" />
                      </div>
                    ) : (
                      <div className="item-empty-notice">
                        <span>No image uploaded for this surface.</span>
                      </div>
                    )}

                    <div className="item-action-btns">
                      <button
                        type="button"
                        className="btn-action-sm btn-action-cam"
                        onClick={() => startLiveCamera(item.id)}
                        disabled={isCheckingQuality || isSubmitting}
                      >
                        📷 {hasFile ? 'Retake' : 'Camera'}
                      </button>
                      <button
                        type="button"
                        className="btn-action-sm btn-action-up"
                        onClick={() => triggerGalleryUpload(item.id)}
                        disabled={isCheckingQuality || isSubmitting}
                      >
                        🖼 {hasFile ? 'Replace' : 'Upload'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Primary "+ ADD PRODUCT VIEW" Button */}
        <button
          type="button"
          className="btn-add-view-primary"
          onClick={() => addAdditionalView('OTHER')}
        >
          [ + ADD PRODUCT VIEW ]
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. OPTIONAL VIDEO ATTACHMENT */}
      {/* ========================================================================= */}
      <div className="wizard-section-box compact">
        <div className="section-box-header">
          <div className="section-box-title">
            <span className="title-icon">🎥</span>
            <h4>ATTACH CONTINUITY VIDEO (OPTIONAL)</h4>
          </div>
          {videoFile && <span className="section-pill good-pill">✓ Attached ({videoFrames.length} Frames)</span>}
        </div>
        <p className="section-desc-note">
          Upload an optional continuous pan of the package. Video supplements but does not replace compulsory Front & Back views.
        </p>
        <button
          type="button"
          className="btn-attach-video"
          onClick={() => videoInputRef.current?.click()}
        >
          {videoFile ? `✓ Video Attached: ${videoFile.name}` : '🎥 Record or Upload Package Video (MP4/MOV)'}
        </button>
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden-input"
          onChange={handleVideoUpload}
        />
      </div>

      {/* ========================================================================= */}
      {/* 4. ANALYZE BUTTON LOGIC & GATING */}
      {/* ========================================================================= */}
      <div className="wizard-final-submit-box">
        {/* Status / Gating Warning Messages (Requirement 2 & 3) */}
        {!canAnalyze && (
          <div className="analysis-gate-warning">
            <span className="gate-icon">⚠️</span>
            <div className="gate-text">
              {!hasFront && !hasBack && (
                <span>Front view is required to identify the product, and Back view is required for complete label and declaration verification.</span>
              )}
              {!hasFront && hasBack && (
                <span>Front view is required to identify the product.</span>
              )}
              {hasFront && !hasBack && (
                <span>Back view is required for complete label and declaration verification.</span>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          className={`btn-start-analysis ${canAnalyze ? 'ready' : 'disabled'}`}
          onClick={handleSubmit}
          disabled={!canAnalyze || isSubmitting}
        >
          {isSubmitting ? (
            'ANALYZING MULTI-VIEW EVIDENCE...'
          ) : !hasFront && !hasBack ? (
            'FRONT & BACK VIEWS REQUIRED TO ANALYZE'
          ) : !hasFront ? (
            'FRONT VIEW REQUIRED TO ANALYZE'
          ) : !hasBack ? (
            'BACK VIEW REQUIRED TO ANALYZE'
          ) : (
            `ANALYZE PRODUCT (${totalViewsCount} VIEW${totalViewsCount > 1 ? 'S' : ''}) →`
          )}
        </button>

        <div className="wizard-submit-footnote">
          <span>Required: Front ✓ Back ✓ | Optional: Top, Bottom, Left, Right, Close-ups</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. LIVE HTML5 CAMERA VIEWFINDER MODAL */}
      {/* ========================================================================= */}
      {activeCameraTarget && (
        <div className="camera-modal-backdrop">
          <div className="camera-modal-content">
            <div className="camera-modal-header">
              <h3>
                {activeCameraTarget === 'front'
                  ? 'CAPTURE FRONT VIEW (REQUIRED)'
                  : activeCameraTarget === 'back'
                  ? 'CAPTURE BACK VIEW (REQUIRED)'
                  : 'CAPTURE ADDITIONAL PRODUCT VIEW'}
              </h3>
              <button className="btn-close-camera" onClick={stopCamera}>✕</button>
            </div>

            <div className="camera-video-wrapper">
              <video ref={videoStreamRef} autoPlay playsInline className="camera-live-video" />
              <div className="framing-overlay-box">
                <div className="framing-corner top-left"></div>
                <div className="framing-corner top-right"></div>
                <div className="framing-corner bottom-left"></div>
                <div className="framing-corner bottom-right"></div>
              </div>
            </div>

            <div className="camera-modal-footer">
              <button className="btn-shutter" onClick={captureStreamSnapshot}>
                <div className="shutter-inner"></div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. IMAGE QUALITY WARNING MODAL */}
      {/* ========================================================================= */}
      {qualityWarning && (
        <div className="quality-modal-backdrop">
          <div className="quality-modal-card">
            <div className="quality-warning-icon">⚠</div>
            <h3 className="quality-warning-title">Image Quality Insufficient</h3>
            <p className="quality-warning-desc">
              Image quality is insufficient for reliable statutory inspection.
            </p>

            <ul className="quality-reasons-list">
              {qualityWarning.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>

            <div className="quality-modal-actions">
              <button className="btn-retake" onClick={handleRetakeWarning}>
                🔄 RETAKE IMAGE
              </button>
              <button className="btn-use-anyway" onClick={handleUseAnywayWarning}>
                USE ANYWAY (LOW QUALITY)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileInspectionWizard;

