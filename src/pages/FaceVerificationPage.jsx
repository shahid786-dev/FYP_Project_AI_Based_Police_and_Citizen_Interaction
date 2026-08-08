/**
 * FaceVerificationPage.jsx
 * ========================
 * Full-page wrapper for the AI Face Verification module.
 * Mounted at /citizen/verify in the React router.
 */

import React, { useEffect, useState } from 'react';
import FaceVerification from '../components/FaceVerification';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const FaceVerificationPage = () => {
  const [history, setHistory]   = useState([]);
  const [histLoading, setHL]    = useState(true);

  const token = localStorage.getItem('accessToken');

  const fetchHistory = () => {
    if (!token) return;
    setHL(true);
    axios
      .get(`${API_BASE}/api/face-verify/history/?limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => setHistory(res.data.results || []))
      .catch(() => {})
      .finally(() => setHL(false));
  };

  useEffect(() => {
    fetchHistory();
  }, []); // eslint-disable-line

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top left, #0d1b2a 0%, #1b2838 40%, #0a0a0a 100%)',
      padding: '40px 20px',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: '#f0f0f0',
    }}>
      <div style={{ maxWidth: '750px', margin: '0 auto' }}>

        {/* Page title */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 800,
            background: 'linear-gradient(90deg, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '0 0 8px',
          }}>
            Biometric Identity Verification
          </h1>
          <p style={{ color: '#8ecae6', fontSize: '14px', margin: 0 }}>
            AI-powered face recognition · NADRA database · Blockchain audit trail
          </p>
        </div>

        {/* Verification component */}
        <FaceVerification
          onVerificationComplete={fetchHistory}
        />

        {/* ── Recent History ───────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          marginTop: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
              📋 Recent Verification History
            </h3>
            <button
              onClick={fetchHistory}
              style={{
                background: 'rgba(102,126,234,0.15)',
                border: '1px solid rgba(102,126,234,0.3)',
                color: '#667eea',
                borderRadius: '8px',
                padding: '4px 12px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>

          {histLoading ? (
            <div style={{ textAlign: 'center', color: '#555', padding: '20px' }}>
              Loading history...
            </div>
          ) : history.length === 0 ? (
            <div style={{
              textAlign: 'center', color: '#555', padding: '24px',
              border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px',
            }}>
              No verification attempts yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {history.map(item => (
                <div key={item.report_id} style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: `1px solid ${item.is_verified ? 'rgba(0,176,155,0.2)' : 'rgba(245,81,95,0.2)'}`,
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>
                      {item.is_verified
                        ? `✅ ${item.matched_citizen_name || 'Matched'}`
                        : `❌ ${item.status_display}`
                      }
                    </div>
                    <div style={{ fontSize: '12px', color: '#777', marginTop: '2px' }}>
                      {new Date(item.verified_at).toLocaleString()}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: item.similarity_pct >= 90
                      ? '#00b09b'
                      : item.similarity_pct >= 70
                      ? '#f7971e'
                      : '#f5515f',
                  }}>
                    {item.similarity_pct?.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default FaceVerificationPage;
