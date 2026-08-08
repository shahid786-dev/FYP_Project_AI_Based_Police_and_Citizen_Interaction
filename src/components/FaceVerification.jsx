/**
 * FaceVerification.jsx
 * ====================
 * Live face verification component for the Citizen Dashboard.
 *
 * Flow:
 * 1. Citizen clicks "Start Verification"
 * 2. Webcam opens with live preview
 * 3. Citizen clicks "Capture & Verify"
 * 4. Frame is captured from video stream
 * 5. Frame is sent to Django API (POST /api/face-verify/verify/)
 * 6. Result is displayed with similarity score and status
 * 7. Verification report is shown with blockchain hash
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';

// ─── Constants ─────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Webcam capture quality (0.9 = 90% JPEG quality)
const CAPTURE_QUALITY = 0.9;

// ─── Helper: get JWT token ──────────────────────────────────────────────────
const getAuthToken = () => localStorage.getItem('accessToken') || '';

// ─── Status Badge Component ─────────────────────────────────────────────────
const StatusBadge = ({ status, similarityPct }) => {
  const configs = {
    VERIFIED: {
      bg: 'linear-gradient(135deg, #00b09b, #96c93d)',
      icon: '✅',
      text: `Verified (${similarityPct?.toFixed(2)}%)`,
    },
    FAILED: {
      bg: 'linear-gradient(135deg, #f5515f, #9f041b)',
      icon: '❌',
      text: 'Verification Failed',
    },
    NO_FACE: {
      bg: 'linear-gradient(135deg, #f7971e, #ffd200)',
      icon: '👤',
      text: 'No Face Detected',
    },
    MULTIPLE_FACES: {
      bg: 'linear-gradient(135deg, #f7971e, #ffd200)',
      icon: '👥',
      text: 'Multiple Faces',
    },
    LOW_QUALITY: {
      bg: 'linear-gradient(135deg, #8e9eab, #eef2f3)',
      icon: '📷',
      text: 'Low Image Quality',
    },
    STORE_NOT_READY: {
      bg: 'linear-gradient(135deg, #614385, #516395)',
      icon: '⚠️',
      text: 'System Not Ready',
    },
  };
  const cfg = configs[status] || configs.FAILED;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 16px',
      borderRadius: '24px',
      background: cfg.bg,
      color: '#fff',
      fontWeight: 700,
      fontSize: '14px',
      letterSpacing: '0.5px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    }}>
      {cfg.icon} {cfg.text}
    </span>
  );
};

// ─── Similarity Meter ────────────────────────────────────────────────────────
const SimilarityMeter = ({ pct }) => {
  const color = pct >= 90 ? '#00b09b' : pct >= 70 ? '#f7971e' : '#f5515f';
  return (
    <div style={{ margin: '12px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', color: '#aaa' }}>Similarity Score</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color }}>{pct?.toFixed(2)}%</span>
      </div>
      <div style={{
        width: '100%', height: '8px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '4px', overflow: 'hidden',
      }}>
        <div style={{
          width: `${Math.min(pct, 100)}%`,
          height: '100%',
          background: color,
          borderRadius: '4px',
          transition: 'width 1s ease',
        }} />
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const FaceVerification = ({ applicationId = null }) => {
  // ── State ────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState('idle'); // idle | camera | processing | result | error
  const [capturedImage, setCapturedImage] = useState(null); // base64
  const [report, setReport] = useState(null);
  const [message, setMessage] = useState('');
  const [errorText, setErrorText] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [storeStatus, setStoreStatus] = useState(null);

  // ── Refs ─────────────────────────────────────────────────────────────
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // ── Load store status on mount ────────────────────────────────────────
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    axios.get(`${API_BASE}/api/face-verify/status/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => setStoreStatus(res.data))
      .catch(() => setStoreStatus({ ready: false, error: 'Could not reach server' }));
  }, []);

  // ── Camera helpers ────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError('');
    setPhase('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:  { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera access was denied. Please allow camera access and try again.'
          : `Could not access camera: ${err.message}`
      );
      setPhase('idle');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Stop camera on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Capture frame from video ──────────────────────────────────────────
  const captureFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', CAPTURE_QUALITY);
  }, []);

  // ── Convert base64 to Blob ────────────────────────────────────────────
  const base64ToBlob = (dataUrl) => {
    const [header, data] = dataUrl.split(',');
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binary = atob(data);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  // ── 3-second countdown then capture ──────────────────────────────────
  const handleCaptureAndVerify = useCallback(() => {
    let count = 3;
    setCountdown(count);
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(interval);
        setCountdown(null);
        executeCapture();
      }
    }, 1000);
  }, []); // eslint-disable-line

  const executeCapture = async () => {
    const dataUrl = captureFrame();
    if (!dataUrl) {
      setErrorText('Failed to capture from webcam.');
      setPhase('error');
      return;
    }

    setCapturedImage(dataUrl);
    stopCamera();
    setPhase('processing');

    try {
      const blob = base64ToBlob(dataUrl);
      const formData = new FormData();
      formData.append('live_image', blob, 'live_capture.jpg');
      if (applicationId) {
        formData.append('application_id', applicationId);
      }

      const token = getAuthToken();
      const response = await axios.post(
        `${API_BASE}/api/face-verify/verify/`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setReport(response.data.report);
      setMessage(response.data.message);
      setPhase('result');

    } catch (err) {
      const detail =
        err.response?.data?.errors ||
        err.response?.data?.detail ||
        err.message ||
        'Unknown error';
      setErrorText(typeof detail === 'object' ? JSON.stringify(detail) : detail);
      setPhase('error');
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setReport(null);
    setMessage('');
    setErrorText('');
    setCameraError('');
    setCountdown(null);
    setPhase('idle');
  };

  // ─────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      maxWidth: '700px',
      margin: '0 auto',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: '#f0f0f0',
    }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        borderRadius: '20px',
        padding: '28px',
        marginBottom: '20px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '32px' }}>🔐</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
              AI Face Verification
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#8ecae6', marginTop: '2px' }}>
              ArcFace Neural Network · Cosine Similarity · Blockchain Audit
            </p>
          </div>
        </div>

        {/* Store status pill */}
        {storeStatus && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', borderRadius: '12px', fontSize: '12px',
            background: storeStatus.ready
              ? 'rgba(0,176,155,0.15)'
              : 'rgba(245,81,95,0.15)',
            border: `1px solid ${storeStatus.ready ? '#00b09b' : '#f5515f'}`,
            color: storeStatus.ready ? '#00b09b' : '#f5515f',
          }}>
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: storeStatus.ready ? '#00b09b' : '#f5515f',
              animation: storeStatus.ready ? 'pulse 2s infinite' : 'none',
            }} />
            {storeStatus.ready
              ? `Ready · ${storeStatus.total_records?.toLocaleString()} records · ${storeStatus.model}`
              : `Not ready: ${storeStatus.error || 'Embeddings not generated'}`
            }
          </div>
        )}
      </div>

      {/* ── Hidden canvas for frame capture ─────────────────────── */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ════════════════════════════════════════════════════════════ */}
      {/* PHASE: idle ─────────────────────────────────────────────── */}
      {/* ════════════════════════════════════════════════════════════ */}
      {phase === 'idle' && (
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '72px', marginBottom: '16px', opacity: 0.9 }}>📷</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>Ready to Verify</h3>
            <p style={{ margin: '0 0 24px', color: '#aaa', fontSize: '14px', lineHeight: 1.6 }}>
              Click the button below to open your webcam.<br />
              Ensure good lighting and position your face clearly in frame.
            </p>

            <button
              id="start-verification-btn"
              onClick={startCamera}
              disabled={storeStatus && !storeStatus.ready}
              style={{
                ...btnStyle,
                background: (storeStatus && !storeStatus.ready)
                  ? 'rgba(255,255,255,0.1)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                cursor: (storeStatus && !storeStatus.ready) ? 'not-allowed' : 'pointer',
                opacity: (storeStatus && !storeStatus.ready) ? 0.5 : 1,
              }}
            >
              🎥 Start Verification
            </button>

            {storeStatus && !storeStatus.ready && (
              <p style={{ color: '#f5515f', fontSize: '13px', marginTop: '12px' }}>
                ⚠️ Embedding store not ready. Run:{' '}
                <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  python manage.py generate_nadra_embeddings
                </code>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* PHASE: camera ───────────────────────────────────────────── */}
      {/* ════════════════════════════════════════════════════════════ */}
      {phase === 'camera' && (
        <div style={cardStyle}>
          {cameraError ? (
            <div style={{ textAlign: 'center', color: '#f5515f', padding: '20px' }}>
              <span style={{ fontSize: '48px' }}>🚫</span>
              <p style={{ marginTop: '12px' }}>{cameraError}</p>
              <button onClick={handleReset} style={{ ...btnStyle, background: '#555' }}>
                Go Back
              </button>
            </div>
          ) : (
            <>
              {/* Video preview */}
              <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%', display: 'block',
                    borderRadius: '12px',
                    transform: 'scaleX(-1)', // mirror effect
                  }}
                />

                {/* Face guide overlay */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -55%)',
                  width: '180px', height: '220px',
                  border: '3px solid rgba(102,126,234,0.8)',
                  borderRadius: '50%',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
                  pointerEvents: 'none',
                }} />

                {/* Countdown overlay */}
                {countdown !== null && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.5)',
                    borderRadius: '12px',
                  }}>
                    <span style={{
                      fontSize: '96px', fontWeight: 900, color: '#fff',
                      textShadow: '0 0 30px rgba(102,126,234,0.8)',
                      animation: 'scaleIn 0.3s ease',
                    }}>
                      {countdown}
                    </span>
                  </div>
                )}
              </div>

              <p style={{ textAlign: 'center', color: '#aaa', fontSize: '13px', margin: '12px 0' }}>
                Position your face within the oval guide and click Capture
              </p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  id="cancel-camera-btn"
                  onClick={() => { stopCamera(); handleReset(); }}
                  style={{ ...btnStyle, background: '#555', flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  id="capture-verify-btn"
                  onClick={handleCaptureAndVerify}
                  disabled={countdown !== null}
                  style={{
                    ...btnStyle,
                    background: 'linear-gradient(135deg, #00b09b, #96c93d)',
                    flex: 2,
                    opacity: countdown !== null ? 0.6 : 1,
                  }}
                >
                  📸 Capture & Verify (3s)
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* PHASE: processing ───────────────────────────────────────── */}
      {/* ════════════════════════════════════════════════════════════ */}
      {phase === 'processing' && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '40px' }}>
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured frame"
              style={{
                width: '160px', height: '160px', objectFit: 'cover',
                borderRadius: '50%', marginBottom: '20px',
                border: '4px solid #667eea',
                transform: 'scaleX(-1)',
              }}
            />
          )}
          <div style={spinnerStyle} />
          <h3 style={{ margin: '20px 0 8px' }}>Analyzing Face...</h3>
          <p style={{ color: '#aaa', fontSize: '13px', margin: 0 }}>
            Generating embedding · Searching {storeStatus?.total_records?.toLocaleString()} records
          </p>
          <div style={{ marginTop: '16px' }}>
            {['Detecting face...', 'Generating ArcFace embedding...', 'Running cosine search...'].map((step, i) => (
              <div key={i} style={{
                fontSize: '12px', color: '#667eea',
                animation: `fadeIn 0.5s ease ${i * 0.4}s both`,
                marginBottom: '4px',
              }}>
                ⚡ {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* PHASE: result ───────────────────────────────────────────── */}
      {/* ════════════════════════════════════════════════════════════ */}
      {phase === 'result' && report && (
        <div style={cardStyle}>
          {/* Status banner */}
          <div style={{
            background: report.is_verified
              ? 'linear-gradient(135deg, rgba(0,176,155,0.15), rgba(150,201,61,0.15))'
              : 'linear-gradient(135deg, rgba(245,81,95,0.15), rgba(159,4,27,0.15))',
            border: `1px solid ${report.is_verified ? '#00b09b' : '#f5515f'}`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>
              {report.is_verified ? '✅' : '❌'}
            </div>
            <StatusBadge status={report.status} similarityPct={report.similarity_pct} />
            <p style={{ margin: '12px 0 0', color: '#ddd', fontSize: '14px' }}>{message}</p>
          </div>

          {/* Similarity meter */}
          <SimilarityMeter pct={report.similarity_pct} />

          {/* Report details grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '20px',
          }}>
            <ReportField label="Matched Citizen" value={report.matched_citizen_name || '—'} />
            <ReportField label="Father Name" value={report.matched_father_name || '—'} />
            <ReportField label="Matched CNIC" value={report.matched_cnic || '—'} />
            <ReportField label="Similarity" value={`${report.similarity_pct?.toFixed(2)}%`} highlight />
            <ReportField label="Confidence" value={report.confidence_level_display || '—'} />
            <ReportField label="Status" value={report.status_display} />
            <ReportField label="Model" value={report.model_used} />
            <ReportField label="Processing Time" value={`${report.processing_time_ms?.toFixed(0)} ms`} />
            <ReportField
              label="Verification Time"
              value={new Date(report.verified_at).toLocaleString()}
              wide
            />
          </div>

          {/* Blockchain audit */}
          {report.blockchain_hash && (
            <div style={{
              background: 'rgba(102,126,234,0.08)',
              border: '1px solid rgba(102,126,234,0.3)',
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '16px',
            }}>
              <div style={{ fontSize: '12px', color: '#667eea', fontWeight: 600, marginBottom: '6px' }}>
                ⛓ Blockchain Audit Trail
              </div>
              <div style={{ fontSize: '11px', color: '#aaa', wordBreak: 'break-all' }}>
                <span style={{ color: '#ddd' }}>Block #{report.blockchain_block_index}</span>
                {' · '}
                <span style={{ fontFamily: 'monospace' }}>{report.blockchain_hash}</span>
              </div>
            </div>
          )}

          {/* Report ID */}
          <div style={{ fontSize: '11px', color: '#555', textAlign: 'center', marginBottom: '16px' }}>
            Report ID: {report.report_id}
          </div>

          {/* Captured preview + action buttons */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Your capture"
                style={{
                  width: '60px', height: '60px', objectFit: 'cover',
                  borderRadius: '50%', border: '2px solid #667eea',
                  transform: 'scaleX(-1)', flexShrink: 0,
                }}
              />
            )}
            <button
              id="verify-again-btn"
              onClick={handleReset}
              style={{ ...btnStyle, background: 'linear-gradient(135deg, #667eea, #764ba2)', flex: 1 }}
            >
              🔄 Verify Again
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* PHASE: error ────────────────────────────────────────────── */}
      {/* ════════════════════════════════════════════════════════════ */}
      {phase === 'error' && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '32px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>⚠️</div>
          <h3 style={{ color: '#f5515f', margin: '0 0 8px' }}>Verification Error</h3>
          <p style={{ color: '#aaa', fontSize: '14px', margin: '0 0 20px' }}>{errorText}</p>
          <button
            onClick={handleReset}
            style={{ ...btnStyle, background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* ── CSS Keyframes ──────────────────────────────────────────── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────
const ReportField = ({ label, value, highlight = false, wide = false }) => (
  <div style={{
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '8px',
    padding: '10px 14px',
    gridColumn: wide ? '1 / -1' : undefined,
  }}>
    <div style={{ fontSize: '11px', color: '#777', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {label}
    </div>
    <div style={{
      fontSize: '14px',
      fontWeight: highlight ? 700 : 400,
      color: highlight ? '#00b09b' : '#f0f0f0',
    }}>
      {value}
    </div>
  </div>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const cardStyle = {
  background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
  borderRadius: '16px',
  padding: '24px',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  marginBottom: '16px',
};

const btnStyle = {
  padding: '12px 24px',
  border: 'none',
  borderRadius: '10px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  letterSpacing: '0.3px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
};

const spinnerStyle = {
  width: '56px',
  height: '56px',
  border: '4px solid rgba(102,126,234,0.2)',
  borderTop: '4px solid #667eea',
  borderRadius: '50%',
  margin: '0 auto',
  animation: 'spin 1s linear infinite',
};

export default FaceVerification;
