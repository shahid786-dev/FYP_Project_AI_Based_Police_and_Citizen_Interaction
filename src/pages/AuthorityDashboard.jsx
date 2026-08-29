import { useState, useEffect } from 'react';
import {
  Shield, Users, FileText, CheckCircle, XCircle, AlertTriangle,
  BarChart2, Clock, Eye, Lock, Download, RefreshCw, Search,
  PlusCircle, Trash2, Edit3, Activity, Database, ChevronDown,
  ChevronUp, Fingerprint, Award, DollarSign
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useSelector } from 'react-redux';
import { authorityAPI, policeAPI, adminAPI, incidentsAPI } from '../api/apiClient';

function StaffModal({ staff, onClose, onSaved }) {
  const [form, setForm] = useState(
    staff || { full_name:'', cnic:'', email:'', mobile_number:'', password:'Staff@1234', role:'POLICE_STAFF' }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [successOtp, setSuccessOtp] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true); setErr(''); setSuccessOtp('');
    try {
      if (staff) {
        await authorityAPI.updateStaff(staff.id, form);
        onSaved();
      } else {
        const res = await authorityAPI.createStaff(form);
        const otp = res.data?.otp_code;
        if (otp) {
          // Show OTP before closing, so admin can give it to the new staff member
          setSuccessOtp(otp);
        } else {
          onSaved();
        }
      }
    } catch(e) {
      setErr(e.response?.data?.detail || JSON.stringify(e.response?.data) || 'Save failed.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl">
        <h3 className="text-white font-bold text-lg">{staff ? 'Edit Police Staff Officer' : 'Add New Police Staff Officer'}</h3>

        {successOtp ? (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-center">
              <p className="text-emerald-400 font-bold text-sm mb-2">✓ Staff Officer Created Successfully!</p>
              <p className="text-slate-400 text-xs mb-3">Share this one-time OTP with the new officer. They will need it for their first login:</p>
              <div className="text-4xl font-mono font-black text-amber-400 tracking-widest py-3 bg-slate-950 rounded-xl border border-amber-500/30">
                {successOtp}
              </div>
              <p className="text-slate-500 text-[10px] mt-2">OTP expires in 5 minutes. Officer logs in with CNIC + Password, then enters this OTP.</p>
            </div>
            <button onClick={onSaved} className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs">
              Done — Close
            </button>
          </div>
        ) : (
          <>
            {[['full_name','Full Name','text'],['cnic','CNIC (e.g. 35202-1234567-1)','text'],['email','Official Email','email'],['mobile_number','Mobile Number','text']].map(([k,l,t]) => (
              <input key={k} type={t} value={form[k]} onChange={set(k)} placeholder={l}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500" />
            ))}
            {!staff && (
              <input type="password" value={form.password} onChange={set('password')} placeholder="Default Password"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500" />
            )}
            {err && <p className="text-red-400 text-xs">{err}</p>}
            <div className="flex gap-3 mt-2">
              <button onClick={onClose} className="w-full py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs">
                {saving ? 'Saving…' : staff ? 'Update Staff' : 'Create Staff'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Application Decision Row ── */
function AppRow({ app, onAction }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState('');

  const decide = async (decision) => {
    setActing(decision);
    try {
      await authorityAPI.decide(app.id, { decision, reason });
      onAction(app.id, decision === 'APPROVE' ? 'AUTHORITY_APPROVED' : 'AUTHORITY_REJECTED');
    } catch { alert('Action failed.'); }
    finally { setActing(''); }
  };

  const issueCert = async () => {
    setActing('CERT');
    try {
      await authorityAPI.issueCert(app.id);
      onAction(app.id, 'COMPLETED');
    } catch(e) { alert(e.response?.data?.error || 'Certificate generation failed.'); }
    finally { setActing(''); }
  };

  const canDecide = app.status === 'STAFF_REVIEWED' || app.status === 'FORWARDED_TO_ADMIN';
  const canCert   = app.status === 'PAYMENT_CONFIRMED' || app.status === 'AUTHORITY_APPROVED';

  return (
    <div className="border border-slate-800 bg-slate-900 rounded-2xl overflow-hidden hover:border-slate-700 transition">
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setOpen(o=>!o)}>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">{app.applicant?.full_name}</p>
          <p className="text-amber-400 text-xs font-mono">{app.tracking_id} · {app.application_type}</p>
        </div>
        <span className="px-2.5 py-1 rounded bg-blue-950 text-blue-300 font-bold text-[10px] uppercase">
          {app.status.replace(/_/g,' ')}
        </span>
        {open ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
      </div>

      {open && (
        <div className="border-t border-slate-800 p-4 flex flex-col gap-4 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><span className="text-slate-500 block text-[10px]">CNIC</span><span className="text-slate-200 font-mono">{app.applicant?.cnic}</span></div>
            <div><span className="text-slate-500 block text-[10px]">EMAIL</span><span className="text-slate-200">{app.applicant?.email}</span></div>
            <div><span className="text-slate-500 block text-[10px]">DISTRICT</span><span className="text-slate-200">{app.applicant?.district||'—'}</span></div>
            <div><span className="text-slate-500 block text-[10px]">SUBMITTED</span><span className="text-slate-200">{new Date(app.submitted_at).toLocaleDateString()}</span></div>
          </div>

          {canDecide && (
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <input value={reason} onChange={e=>setReason(e.target.value)}
                placeholder="Authority decision notes or remarks…" className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />
              <div className="flex gap-2">
                <button onClick={()=>decide('APPROVE')} disabled={!!acting}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs">
                  {acting==='APPROVE'?'Processing...':'Approve Application ✓'}
                </button>
                <button onClick={()=>decide('REJECT')} disabled={!!acting}
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs">
                  Reject
                </button>
              </div>
            </div>
          )}

          {canCert && (
            <button onClick={issueCert} disabled={!!acting}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20">
              <Award size={16}/> Issue Digital Police Certificate
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function AuthorityDashboard() {
  const { user } = useSelector(s => s.auth);
  const [tab, setTab] = useState('applications');
  const [apps, setApps] = useState([]);
  const [staff, setStaff] = useState([]);
  const [sosList, setSosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appRes, staffRes, sosRes] = await Promise.all([
        policeAPI.allApplications().catch(() => ({ data: [] })),
        authorityAPI.listStaff().catch(() => ({ data: [] })),
        incidentsAPI.listSOS().catch(() => ({ data: [] })),
      ]);
      setApps(appRes.data || []);
      setStaff(staffRes.data || []);
      setSosList(sosRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = (id, newStatus) => setApps(prev => prev.map(a => a.id===id ? {...a, status:newStatus} : a));

  return (
    <DashboardLayout role="police" userName={user?.full_name || 'Authority'}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <Shield size={16} className="text-amber-400"/>
            </div>
            <span className="text-amber-400 text-xs font-bold uppercase tracking-widest">High Police Command Portal</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Authority Command Dashboard</h1>
          <p className="text-slate-400 text-xs mt-0.5">Final approvals, certificate generation, staff management, and emergency oversight</p>
        </div>
        <button onClick={loadData} className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 text-xs font-bold hover:text-white">
          <RefreshCw size={14} className="inline mr-1"/> Refresh Ledger
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 text-xs font-bold">
        <button onClick={()=>setTab('applications')} className={`px-4 py-2.5 rounded-xl border ${tab==='applications'?'bg-amber-500/20 border-amber-500 text-amber-300':'bg-slate-900 border-slate-800 text-slate-400'}`}>
          🛡️ Verification Applications ({apps.length})
        </button>
        <button onClick={()=>setTab('staff')} className={`px-4 py-2.5 rounded-xl border ${tab==='staff'?'bg-blue-500/20 border-blue-500 text-blue-300':'bg-slate-900 border-slate-800 text-slate-400'}`}>
          👥 Station Staff ({staff.length})
        </button>
        <button onClick={()=>setTab('sos')} className={`px-4 py-2.5 rounded-xl border ${tab==='sos'?'bg-red-500/20 border-red-500 text-red-300':'bg-slate-900 border-slate-800 text-slate-400'}`}>
          🚨 Live Emergency SOS ({sosList.length})
        </button>
      </div>

      {/* Applications Tab */}
      {tab === 'applications' && (
        <div className="space-y-3">
          {apps.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-8">No active applications in queue.</p>
          ) : (
            apps.map(a => <AppRow key={a.id} app={a} onAction={handleAction}/>)
          )}
        </div>
      )}

      {/* Staff Management Tab */}
      {tab === 'staff' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <h3 className="font-bold text-white text-sm">Station Officers & Staff Accounts</h3>
            <button onClick={()=>setModal('add')} className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl">
              + Add Police Officer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {staff.map(s => (
              <div key={s.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white text-sm">{s.full_name}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">
                    {s.is_active ? 'ACTIVE OFFICER' : 'INACTIVE'}
                  </span>
                </div>
                <p className="text-slate-400 font-mono">CNIC: {s.cnic}</p>
                <p className="text-slate-400">Email: {s.email}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOS Oversight Tab */}
      {tab === 'sos' && (
        <div className="space-y-3">
          {sosList.map(sos => (
            <div key={sos.id} className="p-4 bg-slate-900 border border-red-900/40 rounded-2xl text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-mono text-red-400 font-bold">{sos.sos_id} • {sos.emergency_type}</span>
                <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 font-bold uppercase text-[10px]">{sos.status}</span>
              </div>
              <p className="text-slate-200">Location: {sos.location_address}</p>
              <p className="text-slate-400">Contact: {sos.contact_number}</p>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <StaffModal
          staff={modal !== 'add' ? modal : null}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadData(); }}
        />
      )}
    </DashboardLayout>
  );
}
