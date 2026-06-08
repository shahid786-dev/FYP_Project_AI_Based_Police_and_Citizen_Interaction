import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Lock, User, ChevronRight, AlertCircle } from 'lucide-react';

const ROLES = [
  { id: 'citizen',  label: 'Citizen',       icon: User,   color: 'from-cyan-500 to-blue-600' },
  { id: 'police',   label: 'Police Staff',  icon: Shield, color: 'from-blue-600 to-indigo-700' },
  { id: 'admin',    label: 'Authority/Admin',icon: Lock,  color: 'from-indigo-600 to-purple-700' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole]       = useState('citizen');
  const [cnic, setCnic]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp]         = useState(['','','','','','']);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const formatCnic = (val) => {
    const d = val.replace(/\D/g,'').slice(0,13);
    if (d.length > 12) return `${d.slice(0,5)}-${d.slice(5,12)}-${d.slice(12)}`;
    if (d.length > 5)  return `${d.slice(0,5)}-${d.slice(5)}`;
    return d;
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    if (!cnic || !password) { setError('Please fill in all fields.'); return; }
    
    // Auto-detect role for simulation
    const input = cnic.toLowerCase();
    if (input.includes('admin')) setRole('admin');
    else if (input.includes('police') || input.includes('staff')) setRole('police');
    else setRole('citizen');

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setOtpMode(true);
    }, 1500);
  };

  const handleOtp = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (role === 'citizen') navigate('/citizen/dashboard');
      else if (role === 'police') navigate('/police/dashboard');
      else navigate('/admin/dashboard');
    }, 1200);
  };

  const handleOtpChange = (val, idx) => {
    const arr = [...otp];
    arr[idx] = val.slice(-1);
    setOtp(arr);
    if (val && idx < 5) document.getElementById(`otp-${idx+1}`)?.focus();
  };

  const selectedRole = ROLES.find(r => r.id === role);

  return (
    <div className="page-bg grid-overlay min-h-screen flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
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

              {/* Role selection removed per request - now based on credentials */}

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                  <AlertCircle size={16} />{error}
                </div>
              )}

              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className="label-text">CNIC / Email</label>
                  <input
                    className="input-field font-mono"
                    placeholder="CNIC (e.g. 35202-...) or Email"
                    value={cnic}
                    onChange={e => setCnic(e.target.value.includes('@') ? e.target.value : formatCnic(e.target.value))}
                  />
                  <p className="text-[10px] text-white/20 mt-1">Tip: Use "admin" or "police" in email to test roles</p>
                </div>
                <div>
                  <label className="label-text">Password</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      className="input-field pr-12"
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="button" className="text-cyan-400 text-sm hover:underline">Forgot Password?</button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center justify-center gap-2 w-full mt-2"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                  ) : <>Sign In <ChevronRight size={18} /></>}
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
                <p className="text-white/40 text-sm mt-1">Enter the 6-digit code sent to your registered phone</p>
              </div>
              <form onSubmit={handleOtp} className="flex flex-col gap-6">
                <div className="flex gap-2 justify-center">
                  {otp.map((v, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      maxLength={1}
                      value={v}
                      onChange={e => handleOtpChange(e.target.value, i)}
                      className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-white text-center text-xl font-bold focus:outline-none focus:border-cyan-400 transition font-mono"
                    />
                  ))}
                </div>
                <p className="text-center text-white/40 text-sm">
                  Didn't receive? <button type="button" className="text-cyan-400 hover:underline">Resend OTP</button>
                </p>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center justify-center gap-2 w-full"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                  ) : 'Verify & Sign In'}
                </button>
                <button type="button" onClick={() => setOtpMode(false)} className="text-white/40 text-sm hover:text-white transition">
                  ← Back to Login
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          🔒 Secured by 256-bit encryption · Government of Pakistan
        </p>
      </div>
    </div>
  );
}
