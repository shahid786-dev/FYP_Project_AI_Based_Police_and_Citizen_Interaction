import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Shield, AlertTriangle, CheckCircle, ChevronRight, RotateCcw, Cpu } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';

const CHECKS = [
  { label: 'Facial Feature Extraction',   duration: 1200 },
  { label: 'CNIC Identity Matching',       duration: 1800 },
  { label: 'Deepfake Detection',           duration: 1400 },
  { label: 'Liveness Verification',        duration: 1000 },
  { label: 'Criminal Record Cross-Check',  duration: 2000 },
];

export default function AIFaceRecognitionPage() {
  const navigate = useNavigate();
  const [phase, setPhase]         = useState('idle');    // idle | scanning | done
  const [progress, setProgress]   = useState(0);
  const [checkIdx, setCheckIdx]   = useState(-1);
  const [checks, setChecks]       = useState(CHECKS.map(() => 'pending'));
  const [confidence, setConfidence] = useState(0);

  const startScan = () => {
    setPhase('scanning');
    setProgress(0);
    setCheckIdx(0);
    setChecks(CHECKS.map(() => 'pending'));
    setConfidence(0);
  };

  useEffect(() => {
    if (phase !== 'scanning' || checkIdx < 0) return;
    if (checkIdx >= CHECKS.length) {
      setPhase('done');
      return;
    }
    const duration = CHECKS[checkIdx].duration;
    const steps = 30;
    const perStep = duration / steps;
    const baseProgress = (checkIdx / CHECKS.length) * 100;
    let i = 0;
    setChecks(prev => prev.map((c,idx) => idx === checkIdx ? 'running' : c));
    const iv = setInterval(() => {
      i++;
      const segProgress = (i / steps) * (100 / CHECKS.length);
      setProgress(Math.min(100, baseProgress + segProgress));
      setConfidence(prev => Math.min(97, prev + Math.random() * 3));
      if (i >= steps) {
        clearInterval(iv);
        setChecks(prev => prev.map((c,idx) => idx === checkIdx ? 'done' : c));
        setCheckIdx(prev => prev + 1);
      }
    }, perStep);
    return () => clearInterval(iv);
  }, [checkIdx, phase]);

  const reset = () => { setPhase('idle'); setProgress(0); setCheckIdx(-1); setChecks(CHECKS.map(() => 'pending')); setConfidence(0); };

  const CheckIcon = ({ status }) => {
    if (status === 'done')    return <CheckCircle size={16} className="text-green-400" />;
    if (status === 'running') return <svg className="animate-spin h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>;
    return <div className="w-4 h-4 rounded-full border border-white/20" />;
  };

  return (
    <DashboardLayout role="citizen" userName="Muhammad Ali Khan">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white flex items-center gap-3">
          <Cpu className="text-cyan-400" size={24}/> AI Face Verification
        </h1>
        <p className="text-white/50 mt-1 text-sm">Biometric identity verification using AI facial recognition</p>
      </div>

      {/* Step breadcrumb */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {['Request Details','AI Face Verify','Payment','Under Review','Certificate'].map((s,i) => (
          <div key={i} className="flex items-center gap-2 flex-shrink-0">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${i===1 ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30' : i===0 ? 'bg-green-400/20 text-green-400 border border-green-400/30' : 'text-white/30 border border-white/10'}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${i===1 ? 'bg-cyan-400 text-navy-950' : i===0 ? 'bg-green-400 text-navy-950' : 'bg-white/10'}`}>{i===0 ? '✓' : i+1}</span>
              {s}
            </div>
            {i < 4 && <div className="w-5 h-0.5 bg-white/10 flex-shrink-0" />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Camera UI */}
        <div className="flex flex-col gap-6">
          <div className="glass-card p-6 gradient-border">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Eye size={18} className="text-cyan-400"/> Live Camera Feed</h2>

            {/* Camera viewport */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black/60 border border-cyan-400/20 flex items-center justify-center">
              {/* Background grid */}
              <div className="absolute inset-0 grid-overlay opacity-30" />

              {/* Face circle */}
              <div className="relative z-10">
                <div className={`w-40 h-40 rounded-full border-4 flex items-center justify-center relative transition-all duration-500 ${
                  phase==='scanning' ? 'border-cyan-400 shadow-glow-cyan' :
                  phase==='done'     ? 'border-green-400' : 'border-white/20 border-dashed'
                }`}>
                  <div className="text-6xl">{phase==='done' ? '😊' : '👤'}</div>
                  {phase==='scanning' && (
                    <>
                      <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-ping" />
                      <div className="scan-line" style={{borderRadius:'50%'}} />
                    </>
                  )}
                  {phase==='done' && (
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-green-400 flex items-center justify-center border-2 border-navy-950">
                      <CheckCircle size={20} className="text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Corner markers */}
              {[['top-3 left-3','top','left'],['top-3 right-3','top','right'],['bottom-3 left-3','bottom','left'],['bottom-3 right-3','bottom','right']].map(([pos,v,h],i)=>(
                <div key={i} className={`absolute ${pos} w-8 h-8`}>
                  <div className={`absolute ${v}-0 ${h}-0 w-full h-0.5 bg-cyan-400`}/>
                  <div className={`absolute ${v}-0 ${h}-0 w-0.5 h-full bg-cyan-400`}/>
                </div>
              ))}

              {/* Status overlay */}
              <div className="absolute bottom-3 left-0 right-0 text-center">
                {phase === 'idle'     && <span className="text-white/40 text-xs">Click "Start Scan" to begin</span>}
                {phase === 'scanning' && <span className="text-cyan-400 text-xs font-mono animate-pulse">● SCANNING — PLEASE HOLD STILL</span>}
                {phase === 'done'     && <span className="text-green-400 text-xs font-mono">✓ IDENTITY VERIFIED</span>}
              </div>

              {/* Confidence meter */}
              {phase !== 'idle' && (
                <div className="absolute top-3 right-3 glass-card px-2 py-1 text-xs font-mono text-cyan-400">
                  {confidence.toFixed(1)}% match
                </div>
              )}
            </div>

            {/* Progress bar */}
            {phase !== 'idle' && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-white/50 mb-1">
                  <span>AI Processing</span><span>{progress.toFixed(0)}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mt-5">
              {phase !== 'scanning' && (
                <button onClick={phase==='done' ? reset : startScan}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition ${phase==='done' ? 'border border-white/10 text-white/50 hover:text-white hover:border-white/20' : 'btn-primary'}`}>
                  {phase === 'done' ? <><RotateCcw size={16}/> Scan Again</> : <><Eye size={16}/> Start Face Scan</>}
                </button>
              )}
              {phase === 'scanning' && (
                <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-cyan-400/30 text-cyan-400 text-sm">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  Scanning in progress...
                </div>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="glass-card p-5">
            <p className="text-white/60 text-sm font-medium mb-3">📋 Scanning Tips</p>
            {['Face the camera directly in good lighting','Remove glasses or head coverings','Keep your face within the oval guide','Hold still during the scanning process'].map((tip,i) => (
              <div key={i} className="flex items-center gap-2 text-white/40 text-sm mb-2">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full flex-shrink-0"/>
                {tip}
              </div>
            ))}
          </div>
        </div>

        {/* Verification results */}
        <div className="flex flex-col gap-6">
          {/* AI Checks */}
          <div className="glass-card p-6">
            <h2 className="text-white font-semibold mb-5 flex items-center gap-2"><Shield size={18} className="text-cyan-400"/> Verification Checks</h2>
            <div className="flex flex-col gap-3">
              {CHECKS.map((c, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${checks[i]==='running' ? 'bg-cyan-400/5 border border-cyan-400/20' : checks[i]==='done' ? 'bg-green-400/5' : 'opacity-40'}`}>
                  <CheckIcon status={checks[i]} />
                  <span className={`text-sm flex-1 ${checks[i]==='done' ? 'text-white/80' : checks[i]==='running' ? 'text-cyan-400' : 'text-white/30'}`}>{c.label}</span>
                  {checks[i] === 'done' && <span className="text-green-400 text-xs font-mono">PASS</span>}
                  {checks[i] === 'running' && <span className="text-cyan-400 text-xs font-mono animate-pulse">RUNNING</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Deepfake & Security */}
          <div className="glass-card p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-cyan-400"/> Security Analysis</h2>
            {[
              { label: 'Deepfake Detection', status: phase==='done' ? 'CLEAR' : '—', ok: true },
              { label: 'Spoofing Attempt',   status: phase==='done' ? 'NONE'  : '—', ok: true },
              { label: 'Face Confidence',    status: phase==='done' ? `${confidence.toFixed(1)}%` : '—', ok: true },
              { label: 'Identity Match',     status: phase==='done' ? 'VERIFIED' : '—', ok: true },
            ].map((r,i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                <span className="text-white/50 text-sm">{r.label}</span>
                <span className={`text-sm font-mono font-semibold ${phase==='done' ? 'text-green-400' : 'text-white/20'}`}>{r.status}</span>
              </div>
            ))}
          </div>

          {/* Result Card */}
          {phase === 'done' && (
            <div className="glass-card p-6 border border-green-400/30 bg-green-400/5 animate-slide-up">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-400/20 flex items-center justify-center">
                  <CheckCircle size={22} className="text-green-400" />
                </div>
                <div>
                  <p className="text-green-400 font-semibold">Identity Verified!</p>
                  <p className="text-white/40 text-xs">AI confidence: {confidence.toFixed(1)}%</p>
                </div>
              </div>
              <p className="text-white/50 text-sm mb-5">Your identity has been successfully verified. Proceed to payment to complete your application.</p>
              <button onClick={() => navigate('/citizen/payment')} className="btn-primary flex items-center gap-2 w-full justify-center">
                Proceed to Payment <ChevronRight size={18}/>
              </button>
            </div>
          )}
          {phase === 'idle' && (
            <div className="glass-card p-6 border border-yellow-400/20 bg-yellow-400/5">
              <p className="text-yellow-400 text-sm font-medium mb-1">⚠ Verification Required</p>
              <p className="text-white/40 text-sm">Please complete the AI face scan to proceed with your application.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
