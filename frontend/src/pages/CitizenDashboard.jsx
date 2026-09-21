import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  FileText, Clock, CheckCircle, AlertCircle, PlusCircle, Download, Search,
  User as UserIcon, Camera, AlertTriangle, Ambulance, HeartHandshake, Shield,
  ChevronRight, Bell, CreditCard, Award, Fingerprint, MapPin
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { applicationAPI, incidentsAPI } from '../api/apiClient';
import { setApplications } from '../store/applicationSlice';

const STATUS_CONFIG = {
  PENDING:            { color: 'text-yellow-400', bg: 'bg-yellow-950/50 border-yellow-500/30', label: 'Pending Review' },
  FACE_VERIFIED:      { color: 'text-cyan-400',   bg: 'bg-cyan-950/50 border-cyan-500/30',   label: 'Face Verified' },
  CRIMINAL_CHECKED:   { color: 'text-purple-400', bg: 'bg-purple-950/50 border-purple-500/30', label: 'Under Review' },
  STAFF_REVIEWED:     { color: 'text-blue-400',   bg: 'bg-blue-950/50 border-blue-500/30',   label: 'Staff Reviewed' },
  FORWARDED_TO_ADMIN: { color: 'text-blue-400',   bg: 'bg-blue-950/50 border-blue-500/30',   label: 'Admin Review' },
  AUTHORITY_APPROVED: { color: 'text-emerald-400',bg: 'bg-emerald-950/50 border-emerald-500/30', label: 'Admin Approved' },
  STAFF_CONFIRMED:    { color: 'text-emerald-400',bg: 'bg-emerald-950/50 border-emerald-500/30', label: 'Staff Confirmed' },
  PAYMENT_PENDING:    { color: 'text-orange-400', bg: 'bg-orange-950/50 border-orange-500/30', label: 'Payment Pending' },
  PAYMENT_SUBMITTED:  { color: 'text-orange-400', bg: 'bg-orange-950/50 border-orange-500/30', label: 'Payment Submitted' },
  PAYMENT_VERIFIED:   { color: 'text-emerald-400',bg: 'bg-emerald-950/50 border-emerald-500/30', label: 'Payment Verified' },
  PAYMENT_CONFIRMED:  { color: 'text-emerald-400',bg: 'bg-emerald-950/50 border-emerald-500/30', label: 'Payment Confirmed' },
  AUTHORITY_REJECTED: { color: 'text-red-400',    bg: 'bg-red-950/50 border-red-500/30',     label: 'Rejected' },
  COMPLETED:          { color: 'text-green-400',  bg: 'bg-green-950/50 border-green-500/30', label: 'Completed' },
};

const WORKFLOW_STEPS = [
  { key: 'apply',    label: 'Submit Application', icon: FileText },
  { key: 'face',     label: 'Face Verification',  icon: Fingerprint },
  { key: 'review',   label: 'Admin Review',        icon: Shield },
  { key: 'payment',  label: 'Pay Fees',            icon: CreditCard },
  { key: 'cert',     label: 'Get Certificate',     icon: Award },
];

function getWorkflowStep(status) {
  if (!status || status === 'PENDING') return 0;
  if (status === 'FACE_VERIFIED') return 1;
  if (['CRIMINAL_CHECKED', 'STAFF_REVIEWED', 'FORWARDED_TO_ADMIN', 'AUTHORITY_APPROVED'].includes(status)) return 2;
  if (['STAFF_CONFIRMED', 'PAYMENT_PENDING', 'PAYMENT_SUBMITTED', 'PAYMENT_VERIFIED', 'PAYMENT_CONFIRMED'].includes(status)) return 3;
  if (status === 'COMPLETED') return 4;
  return 0;
}

export default function CitizenDashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const { applications } = useSelector(s => s.application);

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [photoPreview, setPhotoPreview] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    Promise.all([
      applicationAPI.list().catch(() => ({ data: [] })),
      incidentsAPI.listComplaints().catch(() => ({ data: [] })),
    ]).then(([appRes, compRes]) => {
      dispatch(setApplications(appRes.data || []));
      setComplaints(compRes.data || []);
      setLoading(false);
    });

    // Load profile photo if present
    const stored = JSON.parse(localStorage.getItem('pakverify_auth') || 'null');
    if (stored?.user?.photo_url) {
      setPhotoPreview(stored.user.photo_url);
    }
  }, [dispatch]);

  const handleDownloadCert = async (app) => {
    try {
      const res = await applicationAPI.downloadCert(app.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PakVerify_Certificate_${app.tracking_id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Certificate not ready yet. Please check back later.');
    }
  };

  // Latest application for workflow display
  const latestApp = applications[0] || null;
  const workflowStep = latestApp ? getWorkflowStep(latestApp.status) : -1;

  const stats = [
    { label: 'Total Applications', value: applications.length, icon: FileText, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Under Review', value: applications.filter(a => ['CRIMINAL_CHECKED', 'STAFF_REVIEWED'].includes(a.status)).length, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Completed', value: applications.filter(a => a.status === 'COMPLETED').length, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Complaints Filed', value: complaints.length, icon: AlertCircle, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  return (
    <DashboardLayout role="citizen" userName={user?.full_name || 'Citizen'}>

      {/* Top Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Profile Avatar */}
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl border-2 border-cyan-400/40 overflow-hidden bg-slate-800 flex items-center justify-center">
              {photoPreview
                ? <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                : <UserIcon size={28} className="text-slate-500" />}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-slate-950" />
          </div>
          <div>
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Welcome back</p>
            <h1 className="font-display text-2xl font-bold text-white">{user?.full_name || 'Citizen'}</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              CNIC: <span className="font-mono text-cyan-400">{user?.cnic || '—'}</span>
              {user?.province && <> · <span className="text-white/50">{user.province}</span></>}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/emergency-sos"
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-red-950/50 animate-pulse">
            <AlertTriangle size={16} /> Emergency SOS
          </Link>
          <Link to="/citizen/request"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md">
            <PlusCircle size={16} /> New Application
          </Link>
        </div>
      </div>

      {/* ── Verified NADRA Identity Card Display ── */}
      {latestApp?.nadra_details && (
        <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-5 mb-6 bg-gradient-to-r from-cyan-950/30 to-blue-950/20 shadow-xl">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Shield className="text-cyan-400" size={20} />
              <h2 className="text-white font-bold text-sm uppercase tracking-wider">NADRA Verified Identity Card Record</h2>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-green-400/20 text-green-400 font-mono text-xs font-bold flex items-center gap-1">
              <CheckCircle size={12} /> BIOMETRIC MATCHED
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-semibold">Name (on Identity Card)</p>
              <p className="text-white font-bold text-sm mt-0.5">{latestApp.nadra_details.full_name}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-semibold">CNIC Number</p>
              <p className="font-mono text-cyan-400 font-bold text-sm mt-0.5">{latestApp.nadra_details.cnic}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-semibold">Father / Husband Name</p>
              <p className="text-slate-200 font-medium text-sm mt-0.5">{latestApp.nadra_details.father_name}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-semibold">Date of Birth</p>
              <p className="text-slate-200 font-medium text-sm mt-0.5">{latestApp.nadra_details.date_of_birth}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-semibold">Gender</p>
              <p className="text-slate-200 font-medium text-sm mt-0.5">{latestApp.nadra_details.gender}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-semibold">District & Province</p>
              <p className="text-slate-200 font-medium text-sm mt-0.5">{latestApp.nadra_details.district}, {latestApp.nadra_details.province}</p>
            </div>
            <div className="col-span-2 md:col-span-2">
              <p className="text-slate-400 text-[10px] uppercase font-semibold">Permanent Address</p>
              <p className="text-slate-200 font-medium text-sm mt-0.5">{latestApp.nadra_details.address}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={20} className={s.color} />
            </div>
            <div>
              <p className={`font-bold text-xl ${s.color}`}>{s.value}</p>
              <p className="text-slate-500 text-xs">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Application Workflow Guide */}
      {latestApp && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-sm flex items-center gap-2">
              <Shield size={16} className="text-cyan-400" /> Latest Application Progress
            </h2>
            <span className="font-mono text-amber-400 text-xs">{latestApp.tracking_id}</span>
          </div>

          {/* Workflow Steps */}
          <div className="flex items-center justify-between relative mb-6">
            <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-800 z-0" />
            <div className="absolute left-0 top-4 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 z-0 transition-all duration-700"
              style={{ width: `${workflowStep >= 0 ? (workflowStep / (WORKFLOW_STEPS.length - 1)) * 100 : 0}%` }} />

            {WORKFLOW_STEPS.map((ws, i) => {
              const done = i < workflowStep;
              const current = i === workflowStep;
              return (
                <div key={i} className="flex flex-col items-center z-10 flex-1">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mb-2 transition-all ${
                    done    ? 'bg-cyan-400 border-cyan-400 shadow-glow-cyan' :
                    current ? 'bg-slate-900 border-cyan-400 shadow-glow-cyan animate-pulse' :
                              'bg-slate-900 border-slate-700'
                  }`}>
                    {done
                      ? <CheckCircle size={14} className="text-slate-950" />
                      : <ws.icon size={14} className={current ? 'text-cyan-400' : 'text-slate-600'} />}
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${
                    done ? 'text-cyan-400' : current ? 'text-white' : 'text-slate-600'
                  }`}>{ws.label}</span>
                </div>
              );
            })}
          </div>

          {/* Current Status Action */}
          {latestApp.status === 'PENDING' && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-950/30 border border-yellow-500/20 text-xs">
              <Clock size={16} className="text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-yellow-300 font-bold">Face Verification Required</p>
                <p className="text-white/50 mt-0.5">Please complete face verification to proceed.</p>
              </div>
              <Link to="/citizen/face-verify" className="ml-auto px-3 py-1.5 rounded-lg bg-yellow-500 text-slate-950 font-bold text-xs flex items-center gap-1">
                Verify Now <ChevronRight size={12} />
              </Link>
            </div>
          )}

          {['CRIMINAL_CHECKED', 'STAFF_REVIEWED', 'FORWARDED_TO_ADMIN', 'AUTHORITY_APPROVED', 'STAFF_CONFIRMED'].includes(latestApp.status) && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-950/30 border border-blue-500/20 text-xs">
              <Shield size={16} className="text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-blue-300 font-bold">Awaiting Final Approval</p>
                <p className="text-white/50 mt-0.5">Your application is under review by police staff and administration. You'll be notified soon.</p>
              </div>
            </div>
          )}

          {latestApp.status === 'PAYMENT_PENDING' && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs">
              <CreditCard size={16} className="text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-emerald-300 font-bold">Application Approved! Pay Fees Now</p>
                <p className="text-white/50 mt-0.5">Your application has been approved. Pay PKR 650 to receive your certificate.</p>
              </div>
              <Link to="/citizen/payment" className="ml-auto px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1">
                Pay Now <ChevronRight size={12} />
              </Link>
            </div>
          )}

          {['PAYMENT_SUBMITTED', 'PAYMENT_VERIFIED', 'PAYMENT_CONFIRMED'].includes(latestApp.status) && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs">
              <Clock size={16} className="text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-emerald-300 font-bold">Payment Processing</p>
                <p className="text-white/50 mt-0.5">Your payment is being verified. The certificate will be generated shortly.</p>
              </div>
            </div>
          )}

          {latestApp.status === 'COMPLETED' && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-950/30 border border-green-500/20 text-xs">
              <Award size={16} className="text-green-400 flex-shrink-0" />
              <div>
                <p className="text-green-300 font-bold">Certificate Ready!</p>
                <p className="text-white/50 mt-0.5">Your police verification certificate is ready to download.</p>
              </div>
              <button onClick={() => handleDownloadCert(latestApp)}
                className="ml-auto px-3 py-1.5 rounded-lg bg-green-500 text-slate-950 font-bold text-xs flex items-center gap-1">
                Download <Download size={12} />
              </button>
            </div>
          )}

          {latestApp.status === 'AUTHORITY_REJECTED' && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-950/30 border border-red-500/20 text-xs">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
              <div>
                <p className="text-red-300 font-bold">Application Rejected</p>
                <p className="text-white/50 mt-0.5">{latestApp.notes || 'Please contact your local police station for details.'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Action Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Link to="/citizen/request" className="p-4 bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-2xl flex flex-col items-center gap-2 text-center transition group">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 group-hover:bg-cyan-500/20 text-cyan-400 flex items-center justify-center transition">
            <Shield size={20} />
          </div>
          <p className="text-white font-bold text-xs">Police Verification</p>
          <p className="text-slate-500 text-[10px]">Apply for clearance</p>
        </Link>
        <Link to="/report-crime" className="p-4 bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-2xl flex flex-col items-center gap-2 text-center transition group">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 text-blue-400 flex items-center justify-center transition">
            <FileText size={20} />
          </div>
          <p className="text-white font-bold text-xs">Report Crime</p>
          <p className="text-slate-500 text-[10px]">File a complaint</p>
        </Link>
        <Link to="/women-safety" className="p-4 bg-slate-900 border border-slate-800 hover:border-pink-500/40 rounded-2xl flex flex-col items-center gap-2 text-center transition group">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 group-hover:bg-pink-500/20 text-pink-400 flex items-center justify-center transition">
            <HeartHandshake size={20} />
          </div>
          <p className="text-white font-bold text-xs">Women Safety</p>
          <p className="text-slate-500 text-[10px]">Harassment desk</p>
        </Link>
        <Link to="/accident-assistance" className="p-4 bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl flex flex-col items-center gap-2 text-center transition group">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center transition">
            <Ambulance size={20} />
          </div>
          <p className="text-white font-bold text-xs">Accident Help</p>
          <p className="text-slate-500 text-[10px]">Road emergency</p>
        </Link>
      </div>

      {/* All Applications Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-base flex items-center gap-2">
            <Shield size={18} className="text-amber-400" /> My Verification Applications
          </h2>
          <Link to="/citizen/request"
            className="text-xs text-cyan-400 font-semibold hover:underline flex items-center gap-1">
            <PlusCircle size={14} /> New Application
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-8">
            <Shield size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No applications yet</p>
            <Link to="/citizen/request" className="inline-flex items-center gap-1 text-cyan-400 text-xs mt-2 hover:underline">
              <PlusCircle size={12} /> Submit your first application
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {applications.map((app) => {
              const cfg = STATUS_CONFIG[app.status] || { color: 'text-slate-400', bg: 'bg-slate-800 border-slate-700', label: app.status };
              return (
                <div key={app.id} className={`p-3 rounded-xl border ${cfg.bg} flex items-center justify-between gap-3 text-xs`}>
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">{app.application_type}</p>
                    <p className={`font-mono text-[11px] mt-0.5 ${cfg.color}`}>{app.tracking_id}</p>
                    <p className="text-slate-500 text-[10px] mt-0.5">
                      {new Date(app.submitted_at).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    {app.status === 'COMPLETED' && (
                      <button onClick={() => handleDownloadCert(app)}
                        className="text-xs text-green-400 font-bold hover:underline flex items-center gap-1">
                        <Download size={12} /> Cert
                      </button>
                    )}
                    {app.status === 'PAYMENT_PENDING' && (
                      <Link to="/citizen/payment"
                        className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1">
                        <CreditCard size={12} /> Pay
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Complaints */}
      {complaints.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h2 className="text-white font-bold text-base flex items-center gap-2 mb-4">
            <FileText size={18} className="text-blue-400" /> My Complaints & Safety Reports
          </h2>
          <div className="space-y-2">
            {complaints.map((c) => (
              <div key={c.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="text-white font-semibold">{c.title}</p>
                  <p className="text-amber-400 font-mono text-[11px]">{c.complaint_id} · {c.category}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-amber-950 text-amber-300 font-bold uppercase text-[10px]">
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
