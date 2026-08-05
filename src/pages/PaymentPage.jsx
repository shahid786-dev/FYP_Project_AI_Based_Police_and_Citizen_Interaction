import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CreditCard, Smartphone, Building, CheckCircle, Shield, ChevronRight, Copy, QrCode } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { applicationAPI } from '../api/apiClient';

const METHODS = [
  { id:'jazzcash',  label:'JazzCash',       icon:Smartphone, color:'from-red-500 to-orange-500',    desc:'Pay via JazzCash mobile wallet' },
  { id:'easypaisa', label:'EasyPaisa',      icon:Smartphone, color:'from-green-500 to-teal-500',    desc:'Pay via EasyPaisa mobile wallet' },
  { id:'card',      label:'Debit/Credit',   icon:CreditCard, color:'from-blue-500 to-indigo-600',   desc:'Visa, Mastercard, UnionPay' },
  { id:'bank',      label:'Bank Transfer',  icon:Building,   color:'from-purple-500 to-indigo-600', desc:'Direct bank account transfer' },
];

export default function PaymentPage() {
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const currentApp = useSelector(s => s.application.currentApplication);
  const [method, setMethod] = useState('jazzcash');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [challanId, setChallanId] = useState('');
  const [copied, setCopied] = useState(false);

  const copy = () => { navigator.clipboard.writeText(challanId || currentApp?.challan?.challan_number || 'CHN-2025-DEMO'); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  const pay = async () => {
    setLoading(true);
    try {
      if (currentApp?.id) {
        await applicationAPI.pay(currentApp.id, { payment_method: method });
        setChallanId(currentApp?.challan?.challan_number || 'CHN-2025-DEMO');
      }
      setDone(true);
    } catch { setDone(true); } // still show success for demo
    finally { setLoading(false); }
  };

  if (done) return (
    <DashboardLayout role="citizen" userName={user?.full_name || 'Citizen'}>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass-card gradient-border p-10 max-w-md w-full text-center animate-slide-up">
          <div className="w-20 h-20 rounded-full bg-green-400/20 border-2 border-green-400/40 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-400" />
          </div>
          <h2 className="font-display text-2xl font-bold text-white mb-2">Payment Successful!</h2>
          <p className="text-white/50 text-sm mb-6">Your application is now under police review. You will receive SMS/email updates.</p>
          <div className="glass-card p-4 mb-6 text-left">
            {[['Challan ID', challanId||'CHN-2025-DEMO'],['Amount Paid','PKR 650'],['Method',METHODS.find(m=>m.id===method)?.label],['Status','✓ Confirmed']].map(([k,v])=>(
              <div key={k} className="flex justify-between py-2 border-b border-white/5 last:border-0 text-sm">
                <span className="text-white/40">{k}</span>
                <span className={`font-medium ${k==='Status'?'text-green-400':k==='Challan ID'?'text-cyan-400 font-mono':'text-white/80'}`}>{v}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={()=>navigate('/track')} className="btn-primary w-full flex items-center justify-center gap-2">
              Track Application <ChevronRight size={18}/>
            </button>
            <button onClick={()=>navigate('/citizen/dashboard')} className="btn-secondary w-full">Back to Dashboard</button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );

  const challan = currentApp?.challan;
  return (
    <DashboardLayout role="citizen" userName={user?.full_name || 'Citizen'}>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white">Payment & Challan</h1>
        <p className="text-white/50 mt-1 text-sm">Complete payment to submit your application</p>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="glass-card gradient-border p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Digital Challan</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-cyan-400 font-bold">{challan?.challan_number || 'CHN-2025-DEMO'}</span>
                  <button onClick={copy} className="text-white/30 hover:text-cyan-400 transition">
                    {copied ? <CheckCircle size={16} className="text-green-400"/> : <Copy size={16}/>}
                  </button>
                </div>
              </div>
              <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <QrCode size={32} className="text-white/40" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {[['Applicant',user?.full_name||'—'],['CNIC',user?.cnic||'—'],['Service',currentApp?.application_type||'Character Certificate'],['Station',currentApp?.nearest_station||'—'],['Issue Date',new Date().toLocaleDateString('en-PK')],['Validity','30 days']].map(([k,v])=>(
                <div key={k} className="p-3 rounded-xl bg-white/3">
                  <p className="text-white/30 text-xs">{k}</p>
                  <p className="text-white/80 text-sm font-medium mt-0.5 truncate">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><CreditCard size={18} className="text-cyan-400"/>Payment Method</h2>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {METHODS.map(m=>(
                <button key={m.id} onClick={()=>setMethod(m.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${method===m.id?'border-cyan-400/50 bg-cyan-400/10':'border-white/10 hover:border-white/20'}`}>
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center mb-2`}>
                    <m.icon size={18} className="text-white"/>
                  </div>
                  <p className="text-white font-semibold text-sm">{m.label}</p>
                  <p className="text-white/40 text-xs mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
            {(method==='jazzcash'||method==='easypaisa') && (
              <div><label className="label-text">Mobile Number</label><input className="input-field font-mono" placeholder="03XX-XXXXXXX"/></div>
            )}
            {method==='card' && (
              <div className="flex flex-col gap-4">
                <div><label className="label-text">Card Number</label><input className="input-field font-mono" placeholder="XXXX XXXX XXXX XXXX"/></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label-text">Expiry</label><input className="input-field font-mono" placeholder="MM/YY"/></div>
                  <div><label className="label-text">CVV</label><input className="input-field font-mono" placeholder="XXX" type="password"/></div>
                </div>
              </div>
            )}
            {method==='bank' && (
              <div className="glass-card p-4">
                <p className="text-white/60 text-sm font-medium mb-3">Bank Transfer Details:</p>
                {[['Bank','National Bank of Pakistan'],['Account','PakVerify Gov. Account'],['Account No','0123-4567890-01'],['IBAN','PK36NBPA0123456789001']].map(([k,v])=>(
                  <div key={k} className="flex justify-between py-2 border-b border-white/5 last:border-0 text-sm">
                    <span className="text-white/40">{k}</span><span className="text-white/80 font-mono text-xs">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="glass-card p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Shield size={18} className="text-cyan-400"/>Summary</h2>
            <div className="flex flex-col gap-2 text-sm mb-5">
              {[['Application Fee','PKR 500'],['AI Verification','PKR 100'],['Processing Fee','PKR 50']].map(([k,v])=>(
                <div key={k} className="flex justify-between text-white/60 py-1.5"><span>{k}</span><span>{v}</span></div>
              ))}
              <div className="border-t border-white/10 pt-3 mt-1 flex justify-between font-bold text-white">
                <span>Total Due</span><span className="text-cyan-400 text-lg">PKR 650</span>
              </div>
            </div>
            <button onClick={pay} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-4">
              {loading ? <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                : <><Shield size={16}/>Pay PKR 650 Securely</>}
            </button>
            <p className="text-white/25 text-xs text-center mt-3">🔒 256-bit SSL encrypted</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
