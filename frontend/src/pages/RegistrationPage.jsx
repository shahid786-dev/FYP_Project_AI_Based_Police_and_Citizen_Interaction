import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield, Upload, Camera, CheckCircle, ChevronRight, ChevronLeft,
  Eye, EyeOff, User, AlertCircle, Copy, Phone
} from 'lucide-react';
import { authAPI } from '../api/apiClient';

const STEPS = ['Personal Info', 'Address & Contact', 'Security', 'OTP Verify'];

const PROVINCES = ['Punjab', 'Sindh', 'KPK', 'Balochistan', 'AJK', 'Gilgit-Baltistan'];

export default function RegistrationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [showPwd, setShowPwd] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [serverOtp, setServerOtp] = useState(''); // OTP from server (dev mode)
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    cnic: '', fullName: '', fatherName: '', dob: '', gender: '',
    address: '', city: '', province: '', phone: '', email: '',
    password: '', confirmPassword: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const formatCnic = (val) => {
    const d = val.replace(/\D/g, '').slice(0, 13);
    if (d.length > 12) return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
    if (d.length > 5) return `${d.slice(0, 5)}-${d.slice(5)}`;
    return d;
  };

  const next = () => {
    setError('');
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };
  const prev = () => { setError(''); if (step > 0) setStep(s => s - 1); };

  const sendOtp = async () => {
    if (!form.cnic || !form.fullName || !form.email || !form.password) {
      setError('Please complete all required fields before sending OTP.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await authAPI.register({
        cnic: form.cnic,
        full_name: form.fullName,
        father_name: form.fatherName,
        dob: form.dob || null,
        gender: form.gender.toUpperCase(),
        district: form.city,
        province: form.province,
        mobile_number: form.phone,
        email: form.email,
        password: form.password,
        role: 'CITIZEN',
      });
      const otpCode = res.data.otp_code;
      setServerOtp(otpCode || '');
      setOtpSent(true);
      setSuccess(`Registration successful! Your OTP is shown below (dev mode).`);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.error || data?.cnic?.[0] || data?.email?.[0] || 'Registration failed. Check your inputs.';
      setError(msg);
    } finally { setLoading(false); }
  };

  const handleOtpChange = (val, idx) => {
    const arr = [...otp]; arr[idx] = val.slice(-1); setOtp(arr);
    if (val && idx < 5) document.getElementById(`rotp-${idx + 1}`)?.focus();
  };

  const handleVerify = async () => {
    if (!agreed) { setError('Please agree to the terms and conditions.'); return; }
    setLoading(true); setError('');
    try {
      const otpCode = otp.join('');
      await authAPI.verifyOtp({ cnic: form.cnic, otp_code: otpCode });
      setSuccess('Registration complete! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch {
      setError('Invalid or expired OTP. Please try again.');
    } finally { setLoading(false); }
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (file) setPhoto(URL.createObjectURL(file));
  };

  const copyOtp = () => {
    navigator.clipboard.writeText(serverOtp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="page-bg grid-overlay min-h-screen flex items-center justify-center px-4 py-10">
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-2/3 right-1/4 w-64 h-64 bg-cyan-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-glow-cyan animate-glow">
              <Shield size={26} className="text-white" />
            </div>
            <div className="text-left">
              <span className="font-display font-bold text-xl text-white block">PakVerify</span>
              <span className="text-white/40 text-xs">Citizen Registration Portal</span>
            </div>
          </Link>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 gap-0">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className={`flex flex-col items-center ${i <= step ? 'text-cyan-400' : 'text-white/30'}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 ${
                  i < step ? 'bg-cyan-400 border-cyan-400 text-slate-950' :
                  i === step ? 'border-cyan-400 text-cyan-400 shadow-glow-cyan' :
                  'border-white/20 text-white/30'
                }`}>
                  {i < step ? <CheckCircle size={18} /> : i + 1}
                </div>
                <span className="text-xs mt-1 hidden sm:block font-medium">{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 sm:w-20 h-0.5 mx-1 mb-4 sm:mb-0 transition-all duration-300 ${i < step ? 'bg-cyan-400' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="glass-card gradient-border p-8">

          {/* Step 0 — Personal Info */}
          {step === 0 && (
            <div className="animate-fade-in">
              <h2 className="font-display font-bold text-xl text-white mb-6">Personal Information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label-text">CNIC Number *</label>
                  <input className="input-field font-mono" placeholder="35202-1234567-1"
                    value={form.cnic} onChange={e => set('cnic', formatCnic(e.target.value))} />
                  <p className="text-white/30 text-xs mt-1">Format: XXXXX-XXXXXXX-X</p>
                </div>
                <div>
                  <label className="label-text">Full Name *</label>
                  <input className="input-field" placeholder="Muhammad Ali Khan"
                    value={form.fullName} onChange={e => set('fullName', e.target.value)} />
                </div>
                <div>
                  <label className="label-text">Father's Name</label>
                  <input className="input-field" placeholder="Muhammad Khalid Khan"
                    value={form.fatherName} onChange={e => set('fatherName', e.target.value)} />
                </div>
                <div>
                  <label className="label-text">Date of Birth</label>
                  <input type="date" className="input-field" value={form.dob} onChange={e => set('dob', e.target.value)} />
                </div>
                <div>
                  <label className="label-text">Gender *</label>
                  <select className="input-field" value={form.gender} onChange={e => set('gender', e.target.value)}>
                    <option value="">Select Gender</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>

                {/* Photo Upload */}
                <div className="sm:col-span-2">
                  <label className="label-text">Profile Photo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center bg-white/5 overflow-hidden flex-shrink-0">
                      {photo
                        ? <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                        : <User size={32} className="text-white/20" />}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="btn-secondary text-sm cursor-pointer flex items-center gap-2">
                        <Upload size={16} /> Upload Photo
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                      </label>
                      {photo && (
                        <span className="text-green-400 text-xs flex items-center gap-1">
                          <CheckCircle size={12} /> Photo uploaded
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1 — Address & Contact */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="font-display font-bold text-xl text-white mb-6">Address & Contact Details</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="label-text">Complete Address *</label>
                  <textarea className="input-field resize-none" rows={3}
                    placeholder="House No, Street, Mohallah, Area..."
                    value={form.address} onChange={e => set('address', e.target.value)} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-text">City / District *</label>
                    <input className="input-field" placeholder="Lahore"
                      value={form.city} onChange={e => set('city', e.target.value)} />
                  </div>
                  <div>
                    <label className="label-text">Province *</label>
                    <select className="input-field" value={form.province} onChange={e => set('province', e.target.value)}>
                      <option value="">Select Province</option>
                      {PROVINCES.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-text">Phone Number *</label>
                    <input className="input-field font-mono" placeholder="03001234567"
                      value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </div>
                  <div>
                    <label className="label-text">Email Address *</label>
                    <input type="email" className="input-field" placeholder="email@example.com"
                      value={form.email} onChange={e => set('email', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Security */}
          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="font-display font-bold text-xl text-white mb-6">Account Security</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="label-text">Password *</label>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} className="input-field pr-12"
                      placeholder="Min. 8 characters" value={form.password}
                      onChange={e => set('password', e.target.value)} />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[0, 1, 2, 3].map(i => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < passwordStrength() ? strengthColors[passwordStrength() - 1] : 'bg-white/10'}`} />
                        ))}
                      </div>
                      <p className="text-xs text-white/40">{strengthLabels[passwordStrength() - 1] || 'Very Weak'} password</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="label-text">Confirm Password *</label>
                  <input type="password"
                    className={`input-field ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-500/50' : ''}`}
                    placeholder="Re-enter password" value={form.confirmPassword}
                    onChange={e => set('confirmPassword', e.target.value)} />
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                  )}
                </div>
                <div className="glass-card p-4 mt-2">
                  <p className="text-white/60 text-sm font-medium mb-3">Password Requirements:</p>
                  {[
                    { text: 'At least 8 characters', ok: form.password.length >= 8 },
                    { text: 'One uppercase letter', ok: /[A-Z]/.test(form.password) },
                    { text: 'One number', ok: /[0-9]/.test(form.password) },
                    { text: 'One special character', ok: /[^A-Za-z0-9]/.test(form.password) },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm mb-1.5">
                      <CheckCircle size={14} className={r.ok ? 'text-green-400' : 'text-white/20'} />
                      <span className={r.ok ? 'text-green-400' : 'text-white/40'}>{r.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — OTP Verification */}
          {step === 3 && (
            <div className="animate-fade-in">
              <h2 className="font-display font-bold text-xl text-white mb-6">OTP Verification</h2>

              {!otpSent ? (
                <div className="text-center py-4">
                  <div className="w-20 h-20 rounded-full bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center mx-auto mb-5">
                    <Phone size={36} className="text-cyan-400" />
                  </div>
                  <p className="text-white/70 mb-2 text-sm">A 6-digit OTP will be sent to verify your account</p>
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <span className="text-cyan-400 font-mono font-semibold">{form.phone || 'Your phone number'}</span>
                    <span className="text-white/30">•</span>
                    <span className="text-cyan-400 text-sm">{form.email || 'Your email'}</span>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                      <AlertCircle size={16} />{error}
                    </div>
                  )}

                  <button onClick={sendOtp} disabled={loading}
                    className="btn-primary flex items-center justify-center gap-2 mx-auto px-8">
                    {loading
                      ? <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                      : 'Register & Send OTP'}
                  </button>
                </div>
              ) : (
                <div>
                  {/* OTP Display Box (Dev Mode) */}
                  {serverOtp && (
                    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-emerald-950/80 to-emerald-900/40 border border-emerald-500/40">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-emerald-400 font-bold text-sm flex items-center gap-2">
                          <CheckCircle size={16} /> OTP Generated (Dev Mode)
                        </span>
                        <button onClick={copyOtp} className="text-xs text-emerald-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition">
                          <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-white/50 text-xs mb-2">Your One-Time Password for verification:</p>
                      <div className="flex justify-center gap-2 my-3">
                        {serverOtp.split('').map((digit, i) => (
                          <div key={i} className="w-10 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 font-bold text-xl font-mono">
                            {digit}
                          </div>
                        ))}
                      </div>
                      <p className="text-white/30 text-xs text-center">This OTP expires in 10 minutes. Do not share it.</p>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                      <AlertCircle size={16} />{error}
                    </div>
                  )}
                  {success && !error && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm mb-4">
                      <CheckCircle size={16} />{success}
                    </div>
                  )}

                  <p className="text-white/60 text-sm text-center mb-4">
                    Enter the 6-digit OTP from above (or sent to <span className="text-cyan-400">{form.phone}</span>)
                  </p>
                  <div className="flex gap-2 justify-center mb-6">
                    {otp.map((v, i) => (
                      <input key={i} id={`rotp-${i}`} maxLength={1} value={v}
                        onChange={e => handleOtpChange(e.target.value, i)}
                        className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-white text-center text-xl font-bold focus:outline-none focus:border-cyan-400 transition font-mono" />
                    ))}
                  </div>

                  <div className="flex items-center gap-3 mb-6">
                    <input type="checkbox" id="terms" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                      className="w-4 h-4 accent-cyan-400" />
                    <label htmlFor="terms" className="text-white/50 text-sm">
                      I agree to the <Link to="/terms" target="_blank" className="text-cyan-400 hover:underline">Terms & Conditions</Link> and <Link to="/privacy" target="_blank" className="text-cyan-400 hover:underline">Privacy Policy</Link>
                    </label>
                  </div>

                  <button onClick={handleVerify} disabled={loading || !agreed}
                    className="btn-primary w-full flex items-center justify-center gap-2">
                    {loading
                      ? <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                      : 'Verify OTP & Complete Registration'}
                  </button>

                  <button onClick={() => { setOtpSent(false); setServerOtp(''); setOtp(['','','','','','']); }}
                    className="w-full text-center text-white/30 text-xs mt-3 hover:text-white transition">
                    Re-send OTP
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && step !== 3 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mt-4">
              <AlertCircle size={16} />{error}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/5">
            <button onClick={prev} disabled={step === 0}
              className="flex items-center gap-2 text-white/40 hover:text-white disabled:opacity-20 transition">
              <ChevronLeft size={18} /> Previous
            </button>
            {step < STEPS.length - 1 && (
              <button onClick={next} className="btn-primary flex items-center gap-2 py-2.5 px-6">
                Next <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-white/30 text-xs mt-4">
          Already have an account? <Link to="/login" className="text-cyan-400 hover:underline">Sign In</Link>
        </p>
        <p className="text-center text-white/20 text-xs mt-2">
          Secured by 256-bit encryption · Government of Pakistan
        </p>
      </div>
    </div>
  );
}
