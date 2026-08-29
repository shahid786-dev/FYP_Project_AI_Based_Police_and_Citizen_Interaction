import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Shield, Clock, Search, CheckCircle, AlertTriangle, FileText, User,
  ChevronDown, ChevronUp, Eye, MessageSquare, ThumbsUp, ThumbsDown,
  Info, Activity, Fingerprint, AlertCircle, Ambulance, Navigation, Check
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { policeAPI, incidentsAPI } from '../api/apiClient';

export default function StaffDashboard() {
  const { user } = useSelector(s => s.auth);
  const [tab, setTab] = useState('sos'); // 'sos', 'complaints', 'verification', 'criminal'
  
  const [apps, setApps] = useState([]);
  const [sosList, setSosList] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Criminal search state
  const [criminal, setCriminal] = useState({ query: '', type: 'cnic', result: null, loading: false });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appRes, sosRes, compRes] = await Promise.all([
        policeAPI.allApplications().catch(() => ({ data: [] })),
        incidentsAPI.listSOS().catch(() => ({ data: [] })),
        incidentsAPI.listComplaints().catch(() => ({ data: [] })),
      ]);
      setApps(appRes.data || []);
      setSosList(sosRes.data || []);
      setComplaints(compRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSOSStatus = async (id, status) => {
    try {
      await incidentsAPI.updateSOSStatus(id, { status, police_notes: 'Updated by Police Control Desk' });
      fetchData();
    } catch {
      alert('Could not update SOS status.');
    }
  };

  const handleUpdateComplaintStatus = async (id, status) => {
    try {
      await incidentsAPI.updateComplaint(id, { status, police_notes: 'Updated by Station Desk' });
      fetchData();
    } catch {
      alert('Could not update complaint status.');
    }
  };

  const handleCriminalSearch = async () => {
    setCriminal(c => ({ ...c, loading: true, result: null }));
    try {
      const payload = criminal.type === 'cnic' ? { cnic: criminal.query } : { name: criminal.query };
      const res = await policeAPI.criminalSearch(payload);
      setCriminal(c => ({ ...c, result: res.data, loading: false }));
    } catch {
      setCriminal(c => ({ ...c, loading: false, result: { status: 'ERROR', records: [] } }));
    }
  };

  const handleForwardApp = async (id) => {
    try {
      await policeAPI.forward(id, { remarks: 'Reviewed and forwarded to Police Authority' });
      fetchData();
      alert('Application successfully forwarded to Police Authority for decision.');
    } catch (err) { alert('Error forwarding application: ' + (err.response?.data?.error || 'Unknown error')); }
  };

  const handleConfirmApp = async (id) => {
    try {
      await policeAPI.confirmApp(id, {});
      fetchData();
      alert('Application confirmed. Challan generated and sent to citizen.');
    } catch (err) { alert('Error confirming application: ' + (err.response?.data?.error || 'Unknown error')); }
  };

  const handleVerifyPayment = async (id) => {
    try {
      const res = await policeAPI.verifyPayment(id, {});
      fetchData();
      const certNum = res.data?.certificate_number;
      if (certNum) {
        alert(`Payment verified and certificate issued successfully!\nCertificate Number: ${certNum}`);
      } else {
        alert(res.data?.message || 'Payment verified successfully.');
      }
    } catch (err) { alert('Error verifying payment: ' + (err.response?.data?.error || 'Unknown error')); }
  };

  return (
    <DashboardLayout role="staff" userName={user?.full_name || 'Officer'}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
              <Shield size={16} className="text-amber-400" />
            </div>
            <span className="text-amber-400 text-xs font-bold uppercase tracking-widest">District Police Station Desk</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Staff Dispatch & Incident Operations</h1>
          <p className="text-slate-400 text-xs mt-0.5">Manage live Emergency SOS, Crime Complaints, and Verification Applications</p>
        </div>

        <div className="flex gap-2 text-xs font-mono">
          <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-center">
            <span className="text-red-400 font-bold text-base block">{sosList.filter(s => s.status === 'RECEIVED' || s.status === 'DISPATCHED').length}</span>
            <span className="text-slate-500 text-[10px] uppercase">Active SOS</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-center">
            <span className="text-amber-400 font-bold text-base block">{complaints.filter(c => c.status !== 'RESOLVED' && c.status !== 'DISMISSED').length}</span>
            <span className="text-slate-500 text-[10px] uppercase">Complaints</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-center">
            <span className="text-blue-400 font-bold text-base block">{apps.length}</span>
            <span className="text-slate-500 text-[10px] uppercase">Applications</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setTab('sos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition border ${
            tab === 'sos' ? 'bg-red-950/80 border-red-500 text-red-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <AlertTriangle size={16} /> 🚨 Emergency SOS ({sosList.length})
        </button>
        <button
          onClick={() => setTab('complaints')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition border ${
            tab === 'complaints' ? 'bg-amber-950/80 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <FileText size={16} /> 📋 Crime & Safety Reports ({complaints.length})
        </button>
        <button
          onClick={() => setTab('verification')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition border ${
            tab === 'verification' ? 'bg-blue-950/80 border-blue-500 text-blue-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Shield size={16} /> 🛡️ Police Verification Apps ({apps.length})
        </button>
        <button
          onClick={() => setTab('criminal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition border ${
            tab === 'criminal' ? 'bg-purple-950/80 border-purple-500 text-purple-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Search size={16} /> 🔍 Criminal Search Database
        </button>
      </div>

      {/* ── 1. EMERGENCY SOS DESK ── */}
      {tab === 'sos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" /> Control Room Live Emergency SOS Stream
            </h3>
            <button onClick={fetchData} className="text-xs text-amber-400 font-semibold hover:underline">
              Refresh Stream 🔄
            </button>
          </div>

          {sosList.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-500 text-xs">
              No active emergency SOS alerts logged in system.
            </div>
          ) : (
            sosList.map((sos) => (
              <div
                key={sos.id}
                className={`bg-slate-900 border rounded-3xl p-5 shadow-xl space-y-3 transition ${
                  sos.status === 'RECEIVED' ? 'border-red-500/60 bg-red-950/10' : 'border-slate-800'
                }`}
              >
                <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-red-950 border border-red-700/50 text-red-300 font-mono text-[10px] font-bold">
                      {sos.sos_id}
                    </span>
                    <h4 className="font-bold text-white text-sm mt-1">{sos.emergency_type}</h4>
                    <p className="text-slate-400 text-xs mt-0.5">Citizen: {sos.user?.full_name} • Phone: {sos.contact_number}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      sos.status === 'RECEIVED' ? 'bg-red-600 text-white animate-pulse' :
                      sos.status === 'DISPATCHED' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-950 text-emerald-300'
                    }`}>
                      {sos.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 font-bold block text-[10px]">ADDRESS / LOCATION</span>
                    <span className="text-slate-200">{sos.location_address}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 font-bold block text-[10px]">GPS COORDINATES</span>
                    <span className="text-amber-400 font-mono">{sos.latitude ? `${sos.latitude.toFixed(5)}, ${sos.longitude.toFixed(5)}` : 'Manual Address'}</span>
                  </div>
                </div>

                {sos.description && (
                  <p className="text-xs text-slate-300 italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    " {sos.description} "
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-slate-400 font-bold">Control Room Actions:</span>
                  {sos.status !== 'DISPATCHED' && (
                    <button
                      onClick={() => handleUpdateSOSStatus(sos.id, 'DISPATCHED')}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                    >
                      Dispatch Police Patrol Unit 🚓
                    </button>
                  )}
                  {sos.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleUpdateSOSStatus(sos.id, 'RESOLVED')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                    >
                      Mark Resolved ✓
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── 2. CRIME & SAFETY COMPLAINTS DESK ── */}
      {tab === 'complaints' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <FileText size={18} className="text-amber-400" /> District Crime Complaints & Reports
            </h3>
            <button onClick={fetchData} className="text-xs text-amber-400 font-semibold hover:underline">
              Refresh 🔄
            </button>
          </div>

          {complaints.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-500 text-xs">
              No active crime complaints registered.
            </div>
          ) : (
            complaints.map((c) => (
              <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
                <div className="flex justify-between items-start gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-mono text-[10px] font-bold">
                      {c.complaint_id} • {c.category}
                    </span>
                    <h4 className="font-bold text-white text-sm mt-1">{c.title}</h4>
                    <p className="text-slate-400 text-xs mt-0.5">Applicant: {c.user?.full_name} • Date: {c.incident_date}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-blue-950 text-blue-300 text-[10px] font-bold uppercase">
                    {c.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300">{c.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] block font-bold">LOCATION</span>
                    <span className="text-slate-200">{c.location_address}</span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] block font-bold">STOLEN ITEMS / VALUE</span>
                    <span className="text-amber-400">{c.stolen_items_value || 'None reported'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 col-span-2 md:col-span-1">
                    <span className="text-slate-500 text-[10px] block font-bold">SUSPECT DETAILS</span>
                    <span className="text-slate-300">{c.suspect_details || 'Unknown'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-slate-400 font-bold">Station Action:</span>
                  <button
                    onClick={() => handleUpdateComplaintStatus(c.id, 'UNDER_INVESTIGATION')}
                    className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                  >
                    Set Under Investigation
                  </button>
                  <button
                    onClick={() => handleUpdateComplaintStatus(c.id, 'RESOLVED')}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    Resolve Case ✓
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── 3. POLICE VERIFICATION APPS QUEUE ── */}
      {tab === 'verification' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Shield size={18} className="text-blue-400" /> Police Clearance & Verification Queue
            </h3>
            <button onClick={fetchData} className="text-xs text-blue-400 font-semibold hover:underline">
              Refresh 🔄
            </button>
          </div>

          {apps.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-500 text-xs">
              No verification applications in queue.
            </div>
          ) : (
            apps.map((app) => (
              <div key={app.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <span className="font-mono text-amber-400 text-xs font-bold">{app.tracking_id}</span>
                    <h4 className="font-bold text-white text-sm mt-0.5">{app.application_type}</h4>
                    <p className="text-slate-400 text-xs">Applicant: {app.applicant?.full_name} • CNIC: {app.applicant?.cnic}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-blue-950/50 border border-blue-500/30 text-blue-400 font-bold uppercase text-[10px]">
                    {app.status}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-bold">Action Required:</span>
                  {['PENDING', 'UNDER_REVIEW', 'CRIMINAL_CHECKED'].includes(app.status) && (
                    <button onClick={() => handleForwardApp(app.id)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2">
                      Review & Forward to Admin
                    </button>
                  )}
                  {app.status === 'AUTHORITY_APPROVED' && (
                    <button onClick={() => handleConfirmApp(app.id)}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2">
                      Confirm & Generate Challan
                    </button>
                  )}
                  {app.status === 'PAYMENT_SUBMITTED' && (
                    <button onClick={() => handleVerifyPayment(app.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2">
                      Verify Payment & Issue Cert
                    </button>
                  )}
                  {!['PENDING', 'UNDER_REVIEW', 'CRIMINAL_CHECKED', 'AUTHORITY_APPROVED', 'PAYMENT_SUBMITTED'].includes(app.status) && (
                    <span className="text-slate-500 text-xs italic">Awaiting citizen or admin action</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── 4. CRIMINAL SEARCH DATABASE ── */}
      {tab === 'criminal' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Search size={18} className="text-purple-400" /> Search Criminal Ledger Database
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={criminal.query}
              onChange={(e) => setCriminal({ ...criminal, query: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleCriminalSearch()}
              placeholder="Enter CNIC or Full Name..."
              className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
            />
            <button
              onClick={handleCriminalSearch}
              disabled={criminal.loading || !criminal.query.trim()}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl"
            >
              {criminal.loading ? 'Searching...' : 'Search Ledger'}
            </button>
          </div>

          {criminal.result && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-2">
              <span className="font-bold text-emerald-400 block">Ledger Query Result: {criminal.result.status}</span>
              {criminal.result.records?.map((r, idx) => (
                <div key={idx} className="p-2 border-t border-slate-800 text-slate-300">
                  <p>Name: <strong>{r.name}</strong> • CNIC: <span className="font-mono text-amber-400">{r.cnic}</span></p>
                  <p>FIR: {r.fir_number} • Offense: {r.crime_type}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
