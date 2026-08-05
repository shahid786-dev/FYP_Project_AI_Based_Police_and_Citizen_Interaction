import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Upload, FileText, MapPin, ChevronRight, CheckCircle, X, Shield, AlertCircle } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { applicationAPI } from '../api/apiClient';
import { addApplication, setCurrentApplication } from '../store/applicationSlice';

const SERVICE_TYPES = [
  'Character Certificate','Tenant Verification','Employee Verification',
  'General Police Verification','Arms License Verification','Passport Police Clearance',
];
const STATIONS = [
  'Gulberg Police Station, Lahore','DHA Phase 5 Station, Lahore','Model Town Station, Lahore',
  'Cantt Police Station, Lahore','Sadar Police Station, Karachi','F-8 Police Station, Islamabad',
];

function FileUploadBox({ label, accept, required, onFile }) {
  const [file, setFile] = useState(null);
  return (
    <div>
      <label className="label-text">{label} {required && '*'}</label>
      {!file ? (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/15 rounded-xl cursor-pointer hover:border-cyan-400/40 hover:bg-cyan-400/5 transition-all">
          <Upload size={24} className="text-white/30 mb-2" />
          <p className="text-white/40 text-sm">Drop or <span className="text-cyan-400">browse</span></p>
          <p className="text-white/25 text-xs mt-1">PDF, JPG, PNG — Max 10MB</p>
          <input type="file" accept={accept} className="hidden" onChange={e=>{const f=e.target.files[0];setFile(f);onFile?.(f);}} />
        </label>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-400/10 border border-green-400/30">
          <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-green-400 text-sm font-medium truncate">{file.name}</p>
            <p className="text-white/40 text-xs">{(file.size/1024).toFixed(1)} KB</p>
          </div>
          <button onClick={()=>{setFile(null);onFile?.(null);}} className="text-white/30 hover:text-white"><X size={16}/></button>
        </div>
      )}
    </div>
  );
}

export default function VerificationRequestPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const [form, setForm] = useState({ type:'', purpose:'', address:'', station:'' });
  const [docs, setDocs] = useState({ CNIC_FRONT:null, CNIC_BACK:null, PASSPORT_PHOTO:null, SUPPORTING:null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const appRes = await applicationAPI.create({
        application_type: form.type,
        purpose: form.purpose,
        current_address: form.address,
        nearest_station: form.station,
      });
      const app = appRes.data;
      dispatch(addApplication(app));
      dispatch(setCurrentApplication(app));
      // Upload documents in sequence
      for (const [docType, file] of Object.entries(docs)) {
        if (file) {
          const fd = new FormData();
          fd.append('document_type', docType);
          fd.append('file', file);
          await applicationAPI.uploadDoc(app.id, fd);
        }
      }
      navigate('/citizen/face-verify');
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <DashboardLayout role="citizen" userName={user?.full_name || 'Citizen'}>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white">New Verification Request</h1>
        <p className="text-white/50 mt-1 text-sm">Fill in the details to submit your application</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-6">
          <AlertCircle size={16}/>{error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="glass-card p-6">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><FileText size={18} className="text-cyan-400"/>Service Details</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="label-text">Verification Type *</label>
                  <select className="input-field" value={form.type} onChange={e=>set('type',e.target.value)} required>
                    <option value="">Select Service Type</option>
                    {SERVICE_TYPES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-text">Purpose *</label>
                  <input className="input-field" placeholder="e.g. Job application at XYZ Company" value={form.purpose} onChange={e=>set('purpose',e.target.value)} required />
                </div>
                <div>
                  <label className="label-text">Current Address *</label>
                  <textarea className="input-field resize-none" rows={2} value={form.address} onChange={e=>set('address',e.target.value)} required />
                </div>
              </div>
            </div>
            <div className="glass-card p-6">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Upload size={18} className="text-cyan-400"/>Documents</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <FileUploadBox label="CNIC Front" accept="image/*,.pdf" required onFile={f=>setDocs(d=>({...d,CNIC_FRONT:f}))} />
                <FileUploadBox label="CNIC Back"  accept="image/*,.pdf" required onFile={f=>setDocs(d=>({...d,CNIC_BACK:f}))} />
                <FileUploadBox label="Passport Photo" accept="image/*"  required onFile={f=>setDocs(d=>({...d,PASSPORT_PHOTO:f}))} />
                <FileUploadBox label="Supporting Doc" accept="image/*,.pdf"       onFile={f=>setDocs(d=>({...d,SUPPORTING:f}))} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="glass-card p-6">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><MapPin size={18} className="text-cyan-400"/>Police Station</h2>
              <select className="input-field" value={form.station} onChange={e=>set('station',e.target.value)} required>
                <option value="">Select Station</option>
                {STATIONS.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="glass-card p-6">
              <h2 className="text-white font-semibold mb-3 flex items-center gap-2"><Shield size={18} className="text-cyan-400"/>Fee</h2>
              <div className="text-sm space-y-2">
                {[['Application','PKR 500'],['AI Verify','PKR 100'],['Processing','PKR 50']].map(([k,v])=>(
                  <div key={k} className="flex justify-between text-white/60"><span>{k}</span><span>{v}</span></div>
                ))}
                <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-white">
                  <span>Total</span><span className="text-cyan-400">PKR 650</span>
                </div>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 w-full py-4">
              {loading
                ? <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                : <><span>Submit & Proceed</span><ChevronRight size={18}/></>}
            </button>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}
