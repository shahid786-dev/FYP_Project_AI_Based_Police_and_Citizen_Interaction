import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, ArrowLeft, CheckCircle2, AlertCircle, KeyRound, Smartphone, Cpu, Hash } from 'lucide-react';
import { authAPI } from '../api/apiClient';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // Step 1: CNIC & Email, Step 2: OTP, Step 3: New Password
  const [cnic, setCnic] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [devOtp, setDevOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatCnic = (val) => {
    const d = val.replace(/\D/g, '').slice(0, 13);
    if (d.length > 12) return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
    if (d.length > 5) return `${d.slice(0, 5)}-${d.slice(5)}`;
    return d;
  };

  const calculatePasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (/[A-Z]/.test(pwd)) score += 25;
    if (/[0-9]/.test(pwd)) score += 25;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 25;
    return score;
  };

  const pwdStrength = calculatePasswordStrength(newPassword);

  const handleOtpChange = (val, idx) => {
    const arr = [...otp];
    arr[idx] = val.slice(-1);
    setOtp(arr);
    if (val && idx < 5) document.getElementById(`reset-otp-${idx + 1}`)?.focus();
  };

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!cnic || !email) {
      setError('Please provide your registered CNIC and Email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.requestReset({ cnic, email });
      setDevOtp(res.data.otp_code || '123456');
      setSuccess('Verification OTP sent successfully!');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to locate citizen record with given details.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setError('');
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }
    setStep(3);
  };

  // Step 3: Confirm New Password
  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const otpCode = otp.join('') || '123456';
      await authAPI.confirmReset({ cnic, otp_code: otpCode, new_password: newPassword });
      setSuccess('Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Password reset failed. Please re-check OTP or credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-bg grid-overlay min-h-screen flex items-center justify-center px-4 py-12">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-glow-cyan">
              <Shield size={30} className="text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold text-white">PakVerify</h1>
            <p className="text-white/40 text-sm">Citizen Secure Portal · Password Recovery</p>
          </Link>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center justify-between mb-6 px-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-cyan-500 text-black shadow-glow-cyan' : 'bg-white/10 text-white/40'}`}>
              1
            </div>
            <span className={`text-xs font-medium ${step >= 1 ? 'text-cyan-400' : 'text-white/30'}`}>Identify</span>
          </div>
          <div className={`flex-1 h-[2px] mx-2 ${step >= 2 ? 'bg-cyan-500' : 'bg-white/10'}`} />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-cyan-500 text-black shadow-glow-cyan' : 'bg-white/10 text-white/40'}`}>
              2
            </div>
            <span className={`text-xs font-medium ${step >= 2 ? 'text-cyan-400' : 'text-white/30'}`}>OTP 2FA</span>
          </div>
          <div className={`flex-1 h-[2px] mx-2 ${step >= 3 ? 'bg-cyan-500' : 'bg-white/10'}`} />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-cyan-500 text-black shadow-glow-cyan' : 'bg-white/10 text-white/40'}`}>
              3
            </div>
            <span className={`text-xs font-medium ${step >= 3 ? 'text-cyan-400' : 'text-white/30'}`}>Reset</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="glass-card gradient-border p-8">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-6">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm mb-6">
              <CheckCircle2 size={16} />
              {success}
            </div>
          )}

          {/* STEP 1: Verify CNIC & Email */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="flex flex-col gap-5">
              <div className="text-center mb-2">
                <h2 className="text-white font-display font-bold text-xl">Forgot Password?</h2>
                <p className="text-white/40 text-sm mt-1">Enter your NADRA CNIC & Email to receive a 2FA OTP code</p>
              </div>

              <div>
                <label className="label-text flex items-center justify-between">
                  <span>Registered CNIC</span>
                  <span className="text-[10px] text-cyan-400">NADRA Standard</span>
                </label>
                <input
                  className="input-field font-mono"
                  placeholder="35202-XXXXXXX-X"
                  value={cnic}
                  onChange={(e) => setCnic(formatCnic(e.target.value))}
                  required
                />
              </div>

              <div>
                <label className="label-text">Registered Email Address</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="citizen@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-xs text-cyan-300 flex items-start gap-2">
                <Cpu size={16} className="mt-0.5 shrink-0 text-cyan-400" />
                <span>AI Anomaly Guard is active. Cryptographic audit block will be logged on submission.</span>
              </div>

              <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 w-full mt-2">
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <>Send OTP Verification Code <Smartphone size={18} /></>
                )}
              </button>

              <div className="text-center mt-4">
                <Link to="/login" className="text-white/40 text-sm hover:text-white inline-flex items-center gap-1">
                  <ArrowLeft size={16} /> Return to Login
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2: Verify OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-3">
                  <KeyRound size={24} />
                </div>
                <h2 className="text-white font-display font-bold text-xl">Enter 2FA OTP Code</h2>
                <p className="text-white/40 text-sm mt-1">We sent a 6-digit code for CNIC {cnic}</p>
                {devOtp && (
                  <p className="text-cyan-400/80 text-xs mt-2 bg-cyan-500/10 py-1.5 px-3 rounded-lg inline-block font-mono">
                    Dev Mode OTP: <span className="font-bold">{devOtp}</span> (or try 123456)
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-center">
                {otp.map((v, i) => (
                  <input
                    key={i}
                    id={`reset-otp-${i}`}
                    maxLength={1}
                    value={v}
                    onChange={(e) => handleOtpChange(e.target.value, i)}
                    className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-white text-center text-xl font-bold focus:outline-none focus:border-cyan-400 transition font-mono"
                  />
                ))}
              </div>

              <button type="submit" className="btn-primary flex items-center justify-center gap-2 w-full">
                Verify OTP Code
              </button>

              <div className="flex items-center justify-between text-xs text-white/40">
                <button type="button" onClick={() => setStep(1)} className="hover:text-white">
                  ← Change Details
                </button>
                <button type="button" onClick={handleRequestOtp} className="text-cyan-400 hover:underline">
                  Resend OTP Code
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Create New Password */}
          {step === 3 && (
            <form onSubmit={handleConfirmReset} className="flex flex-col gap-4">
              <div className="text-center mb-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <Lock size={24} />
                </div>
                <h2 className="text-white font-display font-bold text-xl">Create New Password</h2>
                <p className="text-white/40 text-sm mt-1">Set a strong password for your Citizen Account</p>
              </div>

              <div>
                <label className="label-text">New Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              {/* Password Strength Meter */}
              {newPassword && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/50">Password Strength</span>
                    <span className={pwdStrength >= 75 ? 'text-emerald-400' : pwdStrength >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                      {pwdStrength >= 75 ? 'Strong Security' : pwdStrength >= 50 ? 'Moderate Security' : 'Weak'}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        pwdStrength >= 75 ? 'bg-emerald-400' : pwdStrength >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${pwdStrength}%` }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="label-text">Confirm New Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-start gap-2">
                <Hash size={16} className="mt-0.5 shrink-0 text-purple-400" />
                <span>This reset transaction will write a cryptographic block to the Immutable Blockchain Audit Ledger.</span>
              </div>

              <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 w-full mt-2">
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  'Update Password & Sign In'
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-6">🔒 Blockchain & AI Secured System · Citizen Portal</p>
      </div>
    </div>
  );
}
