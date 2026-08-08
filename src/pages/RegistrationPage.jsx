import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Upload, Camera, CheckCircle, ChevronRight, ChevronLeft, Eye, EyeOff, User, AlertCircle } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { authAPI } from '../api/apiClient';
import { loginSuccess } from '../store/authSlice';

const STEPS = ['Personal Info', 'Address & Contact', 'Security', 'Verification'];

export default function RegistrationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [showPwd, setShowPwd] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['','','','','','']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    cnic:'', fullName:'', fatherName:'', dob:'', gender:'',
    address:'', city:'', province:'', phone:'', email:'',
    password:'', confirmPassword:'',
  });

  const set = (k,v) => setForm(f => ({ ...f, [k]: v }));

  const formatCnic = (val) => {
    const d = val.replace(/\D/g,'').slice(0,13);
    if (d.length > 12) return `${d.slice(0,5)}-${d.slice(5,12)}-${d.slice(12)}`;
    if (d.length > 5)  return `${d.slice(0,5)}-${d.slice(5)}`;
    return d;
  };

  const next = () => { if (step < STEPS.length-1) setStep(s => s+1); };
  const prev = () => { if (step > 0) setStep(s => s-1); };

  const sendOtp = async () => {
    setLoading(true); setError('');
    try {
      await authAPI.register({
        cnic: form.cnic,
        full_name: form.fullName,
        father_name: form.fatherName,
        date_of_birth: form.dob,
        gender: form.gender.toUpperCase(),
        district: form.city,
        province: form.province,
        mobile_number: form.phone,
        email: form.email,
        password: form.password,
        role: 'CITIZEN'
      });
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.cnic?.[0] || 'Registration failed. Check your inputs.');
    } finally { setLoading(false); }
  };

  const handleOtpChange = (val, idx) => {
    const arr = [...otp]; arr[idx] = val.slice(-1); setOtp(arr);
    if (val && idx < 5) document.getElementById(`rotp-${idx+1}`)?.focus();
  };

  const handleSubmit = async () => {
    if (!agreed) return;
    setLoading(true); setError('');
    try {
      const otpCode = otp.join('');
      const res = await authAPI.verifyOtp({ cnic: form.cnic, otp_code: otpCode });
      const { access, role, full_name, cnic } = res.data;
      dispatch(loginSuccess({ token: access, user: { full_name, cnic }, role }));
      navigate('/citizen/dashboard');
    } catch (err) {
      setError('Invalid or expired OTP.');
    } finally { setLoading(false); }
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (file) setPhoto(URL.createObjectURL(file));
  };

  return (
    <div className="page-bg grid-overlay min-h-screen flex items-center justify-center px-4 py-10">
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-glow-cyan">
              <Shield size={22} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl text-white">PakVerify</span>
          </Link>
          <p className="text-white/40 text-sm mt-2">Create your citizen account</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center mb-8 gap-0">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className={`flex flex-col items-center ${i <= step ? 'text-cyan-400' : 'text-white/30'}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 ${
                  i < step  ? 'bg-cyan-400 border-cyan-400 text-navy-950' :
                  i === step ? 'border-cyan-400 text-cyan-400' :
                  'border-white/20 text-white/30'
                }`}>
                  {i < step ? <CheckCircle size={18} /> : i + 1}
                </div>
                <span className="text-xs mt-1 hidden sm:block font-medium">{s}</span>
              </div>
              {i < STEPS.length-1 && (
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
                  <input className="input-field font-mono" placeholder="35202-1234567-1" value={form.cnic} onChange={e=>set('cnic',formatCnic(e.target.value))} />
                </div>
                <div>
                  <label className="label-text">Full Name *</label>
                  <input className="input-field" placeholder="Muhammad Ali Khan" value={form.fullName} onChange={e=>set('fullName',e.target.value)} />
                </div>
                <div>
                  <label className="label-text">Father's Name *</label>
                  <input className="input-field" placeholder="Muhammad Khalid Khan" value={form.fatherName} onChange={e=>set('fatherName',e.target.value)} />
                </div>
                <div>
                  <label className="label-text">Date of Birth *</label>
                  <input type="date" className="input-field" value={form.dob} onChange={e=>set('dob',e.target.value)} />
                </div>
                <div>
                  <label className="label-text">Gender *</label>
                  <select className="input-field" value={form.gender} onChange={e=>set('gender',e.target.value)}>
                    <option value="">Select Gender</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>

                {/* Photo Upload */}
                <div className="sm:col-span-2">
                  <label className="label-text">Profile Photo *</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center bg-white/5 overflow-hidden flex-shrink-0">
                      {photo
                        ? <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                        : <User size={32} className="text-white/20" />}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="btn-secondary text-sm cursor-pointer flex items-center gap-2">
                        <Upload size={16}/> Upload Photo
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                      </label>
                      <button className="btn-secondary text-sm flex items-center gap-2 opacity-60">
                        <Camera size={16}/> Capture via Camera
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1 — Address & Contact */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="font-display font-bold text-xl text-white mb-6">Address & Contact</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="label-text">Complete Address *</label>
                  <textarea className="input-field resize-none" rows={3} placeholder="House No, Street, Mohallah..." value={form.address} onChange={e=>set('address',e.target.value)} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-text">City *</label>
                    <input className="input-field" placeholder="Lahore" value={form.city} onChange={e=>set('city',e.target.value)} />
                  </div>
                  <div>
                    <label className="label-text">Province *</label>
                    <select className="input-field" value={form.province} onChange={e=>set('province',e.target.value)}>
                      <option value="">Select Province</option>
                      <option>Punjab</option><option>Sindh</option><option>KPK</option>
                      <option>Balochistan</option><option>AJK</option><option>Gilgit-Baltistan</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-text">Phone Number *</label>
                    <input className="input-field font-mono" placeholder="0300-1234567" value={form.phone} onChange={e=>set('phone',e.target.value)} />
                  </div>
                  <div>
                    <label className="label-text">Email Address</label>
                    <input type="email" className="input-field" placeholder="email@example.com" value={form.email} onChange={e=>set('email',e.target.value)} />
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
                    <input type={showPwd ? 'text':'password'} className="input-field pr-12" placeholder="Min. 8 characters" value={form.password} onChange={e=>set('password',e.target.value)} />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                      {showPwd ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full ${form.password.length >= i*3 ? (form.password.length >= 12 ? 'bg-green-400' : form.password.length >= 8 ? 'bg-yellow-400' : 'bg-red-400') : 'bg-white/10'}`} />
                        ))}
                      </div>
                      <p className="text-xs text-white/40">
                        {form.password.length < 8 ? 'Weak' : form.password.length < 12 ? 'Medium' : 'Strong'} password
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="label-text">Confirm Password *</label>
                  <input type="password" className={`input-field ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-500/50' : ''}`} placeholder="Re-enter password" value={form.confirmPassword} onChange={e=>set('confirmPassword',e.target.value)} />
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                  )}
                </div>
                <div className="glass-card p-4 mt-2">
                  <p className="text-white/60 text-sm font-medium mb-3">Password Requirements:</p>
                  {['At least 8 characters','One uppercase letter','One number','One special character'].map((r,i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-white/40 mb-1">
                      <CheckCircle size={14} className={form.password.length >= 8 ? 'text-green-400' : 'text-white/20'} />
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Verification */}
          {step === 3 && (
            <div className="animate-fade-in">
              <h2 className="font-display font-bold text-xl text-white mb-6">OTP Verification</h2>
              {!otpSent ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center mx-auto mb-4">
                    <Shield size={32} className="text-cyan-400" />
                  </div>
                  <p className="text-white/70 mb-2">We'll send a 6-digit OTP to:</p>
                  <p className="text-cyan-400 font-mono font-semibold mb-6">{form.phone || '0300-XXXXXXX'}</p>
                  {error && <div className="text-red-400 text-sm mb-4 flex items-center justify-center gap-2"><AlertCircle size={16}/>{error}</div>}
                  <button onClick={sendOtp} disabled={loading} className="btn-primary flex items-center justify-center gap-2 mx-auto">
                    {loading ? <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> : 'Register & Send OTP'}
                  </button>
                </div>
              ) : (
                <div>
                  {error && <div className="text-red-400 text-sm mb-4 text-center flex items-center justify-center gap-2"><AlertCircle size={16}/>{error}</div>}
                  <p className="text-white/60 text-sm text-center mb-6">Enter the 6-digit code sent to <span className="text-cyan-400">{form.phone}</span></p>
                  <div className="flex gap-2 justify-center mb-6">
                    {otp.map((v, i) => (
                      <input key={i} id={`rotp-${i}`} maxLength={1} value={v} onChange={e=>handleOtpChange(e.target.value,i)}
                        className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-white text-center text-xl font-bold focus:outline-none focus:border-cyan-400 transition font-mono" />
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-4 mb-6">
                    <input type="checkbox" id="terms" checked={agreed} onChange={e=>setAgreed(e.target.checked)} className="w-4 h-4 accent-cyan-400" />
                    <label htmlFor="terms" className="text-white/50 text-sm">I agree to the <a href="#" className="text-cyan-400 hover:underline">Terms & Conditions</a> and <a href="#" className="text-cyan-400 hover:underline">Privacy Policy</a></label>
                  </div>
                  <button onClick={handleSubmit} disabled={loading || !agreed} className="btn-primary w-full flex items-center justify-center gap-2">
                    {loading ? <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> : 'Complete Registration'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/5">
            <button onClick={prev} disabled={step===0} className="flex items-center gap-2 text-white/40 hover:text-white disabled:opacity-20 transition">
              <ChevronLeft size={18}/> Previous
            </button>
            {step < STEPS.length-1 && (
              <button onClick={next} className="btn-primary flex items-center gap-2 py-2.5">
                Next <ChevronRight size={18}/>
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-white/30 text-xs mt-4">
          Already have an account? <Link to="/login" className="text-cyan-400 hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
