import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Shield, Eye, EyeOff, Lock, User, ChevronRight, AlertCircle } from 'lucide-react';
import { authAPI } from '../api/apiClient';
import { loginSuccess } from '../store/authSlice';

const ROLES = [
  { id: 'CITIZEN',          label: 'Citizen',         icon: User,   color: 'from-cyan-500 to-blue-600' },
  { id: 'POLICE_STAFF',     label: 'Police Staff',    icon: Shield, color: 'from-blue-600 to-indigo-700' },
  { id: 'SUPER_ADMIN',      label: 'Authority/Admin', icon: Lock,   color: 'from-indigo-600 to-purple-700' },
];

export default function LoginPage() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const [cnic, setCnic]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp]         = useState(['','','','','','']);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [detectedRole, setDetectedRole] = useState('CITIZEN');

  const formatCnic = (val) => {
    const d = val.replace(/\D/g,'').slice(0,13);
    if (d.length > 12) return `${d.slice(0,5)}-${d.slice(5,12)}-${d.slice(12)}`;
    if (d.length > 5)  return `${d.slice(0,5)}-${d.slice(5)}`;
    return d;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!cnic || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const res = await authAPI.login({ cnic, password });
      console.log('OTP (dev):', res.data.otp_code);
      setOtpMode(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const otpCode = otp.join('');
      const res = await authAPI.verifyOtp({ cnic, otp_code: otpCode });
      const { access, role, full_name } = res.data;
      dispatch(loginSuccess({ token: access, user: { full_name, cnic }, role }));
      if (role === 'CITIZEN')              navigate('/citizen/dashboard');
      else if (role === 'POLICE_STAFF')    navigate('/staff/dashboard');
      else if (role === 'POLICE_AUTHORITY')navigate('/authority/dashboard');
      else navigate('/admin/dashboard');
    } catch (err) {
      setError('Invalid or expired OTP. Try 123456 for testing.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (val, idx) => {
    const arr = [...otp];
    arr[idx] = val.slice(-1);
    setOtp(arr);
    if (val && idx < 5) document.getElementById(`otp-${idx+1}`)?.focus();
  };

  const selectedRole = ROLES.find(r => r.id === detectedRole) || ROLES[0];

  return (
    <div className="page-bg grid-overlay min-h-screen flex items-center justify-center px-4">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-glow-cyan animate-glow">
              <Shield size={30} className="text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold text-white">PakVerify</h1>
            <p className="text-white/40 text-sm">AI Police Verification System</p>
          </Link>
        </div>

        <div className="glass-card gradient-border p-8">
          {!otpMode ? (
            <>
              <h2 className="text-white font-display font-bold text-xl mb-1 text-center">Welcome Back</h2>
              <p className="text-white/40 text-sm text-center mb-6">Sign in to your account</p>
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                  <AlertCircle size={16} />{error}
                </div>
              )}
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className="label-text">CNIC / Email</label>
                  <input className="input-field font-mono" placeholder="CNIC (35202-XXXXXXX-X) or Email"
                    value={cnic} onChange={e => setCnic(e.target.value.includes('@') ? e.target.value : formatCnic(e.target.value))} />
                </div>
                <div>
                  <label className="label-text">Password</label>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} className="input-field pr-12"
                      placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                   <Link to="/forgot-password" className="text-cyan-400 text-sm hover:underline">Forgot Password?</Link>
                </div>
                <button type="submit" disabled={loading}
                  className="btn-primary flex items-center justify-center gap-2 w-full mt-2">
                  {loading
                    ? <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                    : <>Sign In <ChevronRight size={18} /></>}
                </button>
              </form>
              <div className="mt-6 text-center text-sm text-white/40">
                Don't have an account?{' '}
                <Link to="/register" className="text-cyan-400 font-semibold hover:underline">Register Now</Link>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${selectedRole.color} flex items-center justify-center mx-auto mb-3 shadow-glow-blue`}>
                  <selectedRole.icon size={28} className="text-white" />
                </div>
                <h2 className="text-white font-display font-bold text-xl">OTP Verification</h2>
                <p className="text-white/40 text-sm mt-1">Enter the 6-digit code sent to your phone</p>
                <p className="text-cyan-400/60 text-xs mt-1">(Dev mode: use 123456 to bypass)</p>
              </div>
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                  <AlertCircle size={16} />{error}
                </div>
              )}
              <form onSubmit={handleOtp} className="flex flex-col gap-6">
                <div className="flex gap-2 justify-center">
                  {otp.map((v, i) => (
                    <input key={i} id={`otp-${i}`} maxLength={1} value={v}
                      onChange={e => handleOtpChange(e.target.value, i)}
                      className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-white text-center text-xl font-bold focus:outline-none focus:border-cyan-400 transition font-mono" />
                  ))}
                </div>
                <button type="submit" disabled={loading}
                  className="btn-primary flex items-center justify-center gap-2 w-full">
                  {loading
                    ? <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                    : 'Verify & Sign In'}
                </button>
                <button type="button" onClick={() => setOtpMode(false)} className="text-white/40 text-sm hover:text-white transition">← Back to Login</button>
              </form>
            </>
          )}
        </div>
        <p className="text-center text-white/20 text-xs mt-6">🔒 Secured by 256-bit encryption · Government of Pakistan</p>
      </div>
    </div>
  );
}
