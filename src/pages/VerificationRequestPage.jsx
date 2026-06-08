import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, MapPin, Camera, ChevronRight, CheckCircle, X, Shield } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';

const SERVICE_TYPES = [
  'Character Certificate',
  'Tenant Verification',
  'Employee Verification',
  'General Police Verification',
  'Arms License Verification',
  'Passport Police Clearance',
];

const STATIONS = [
  'Gulberg Police Station, Lahore',
  'DHA Phase 5 Station, Lahore',
  'Model Town Station, Lahore',
  'Cantt Police Station, Lahore',
  'Johar Town Station, Lahore',
  'Garden Town Station, Lahore',
  'Shadman Station, Lahore',
  'Sadar Police Station, Karachi',
  'Clifton Station, Karachi',
  'F-8 Police Station, Islamabad',
];

function FileUploadBox({ label, accept, required }) {
  const [file, setFile] = useState(null);
  return (
    <div>
      <label className="label-text">{label} {required && '*'}</label>
      {!file ? (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/15 rounded-xl cursor-pointer hover:border-cyan-400/40 hover:bg-cyan-400/5 transition-all duration-200">
          <Upload size={24} className="text-white/30 mb-2" />
          <p className="text-white/40 text-sm">Drag & drop or <span className="text-cyan-400">browse</span></p>
          <p className="text-white/25 text-xs mt-1">PDF, JPG, PNG — Max 5MB</p>
          <input type="file" accept={accept} className="hidden" onChange={e => setFile(e.target.files[0])} />
        </label>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-400/10 border border-green-400/30">
          <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-green-400 text-sm font-medium truncate">{file.name}</p>
            <p className="text-white/40 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button onClick={() => setFile(null)} className="text-white/30 hover:text-white"><X size={16}/></button>
        </div>
      )}
    </div>
  );
}

export default function VerificationRequestPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ type:'', purpose:'', address:'', station:'', notes:'' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); navigate('/citizen/face-verify'); }, 1500);
  };

  return (
    <DashboardLayout role="citizen" userName="Muhammad Ali Khan">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white">New Verification Request</h1>
        <p className="text-white/50 mt-1 text-sm">Fill in the details below to submit your application</p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {['Request Details','AI Face Verify','Payment','Under Review','Certificate'].map((s,i) => (
          <div key={i} className="flex items-center gap-2 flex-shrink-0">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${i===0 ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30' : 'text-white/30 border border-white/10'}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${i===0 ? 'bg-cyan-400 text-navy-950' : 'bg-white/10'}`}>{i+1}</span>
              {s}
            </div>
            {i < 4 && <div className="w-5 h-0.5 bg-white/10 flex-shrink-0" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left — main form */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Service Type */}
            <div className="glass-card p-6">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><FileText size={18} className="text-cyan-400"/> Service Details</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="label-text">Verification Type *</label>
                  <select className="input-field" value={form.type} onChange={e=>set('type',e.target.value)} required>
                    <option value="">Select Service Type</option>
                    {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-text">Purpose of Verification *</label>
                  <input className="input-field" placeholder="e.g. Job application at XYZ Company" value={form.purpose} onChange={e=>set('purpose',e.target.value)} required />
                </div>
                <div>
                  <label className="label-text">Current Address *</label>
                  <textarea className="input-field resize-none" rows={2} placeholder="Your full current address" value={form.address} onChange={e=>set('address',e.target.value)} required />
                </div>
                <div>
                  <label className="label-text">Additional Notes</label>
                  <textarea className="input-field resize-none" rows={2} placeholder="Any additional information..." value={form.notes} onChange={e=>set('notes',e.target.value)} />
                </div>
              </div>
            </div>

            {/* Document Uploads */}
            <div className="glass-card p-6">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Upload size={18} className="text-cyan-400"/> Document Uploads</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <FileUploadBox label="CNIC Front Side" accept="image/*,.pdf" required />
                <FileUploadBox label="CNIC Back Side" accept="image/*,.pdf" required />
                <FileUploadBox label="Passport-size Photo" accept="image/*" required />
                <FileUploadBox label="Supporting Document" accept="image/*,.pdf" />
              </div>
            </div>

            {/* AI Face Scan */}
            <div className="glass-card p-6 gradient-border">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Camera size={18} className="text-cyan-400"/> AI Face Verification</h2>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-cyan-400/5 border border-cyan-400/15">
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-cyan-400/40 flex items-center justify-center flex-shrink-0">
                  <Camera size={24} className="text-cyan-400/60" />
                </div>
                <div className="flex-1">
                  <p className="text-white/80 text-sm font-medium">Biometric Face Scan Required</p>
                  <p className="text-white/40 text-xs mt-0.5">AI will verify your identity against CNIC data on the next step.</p>
                </div>
                <div className="status-review text-xs">Next Step</div>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex flex-col gap-6">
            {/* Police Station */}
            <div className="glass-card p-6">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><MapPin size={18} className="text-cyan-400"/> Police Station</h2>
              <div>
                <label className="label-text">Select Nearest Station *</label>
                <select className="input-field" value={form.station} onChange={e=>set('station',e.target.value)} required>
                  <option value="">Select Police Station</option>
                  {STATIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              {form.station && (
                <div className="mt-4 p-3 rounded-xl bg-green-400/5 border border-green-400/20 text-xs text-green-400">
                  ✓ Station selected. Processing time: 3–5 working days.
                </div>
              )}
            </div>

            {/* Fee Summary */}
            <div className="glass-card p-6">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Shield size={18} className="text-cyan-400"/> Fee Summary</h2>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between text-white/60">
                  <span>Application Fee</span><span>PKR 500</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>AI Verification</span><span>PKR 100</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Processing Fee</span><span>PKR 50</span>
                </div>
                <div className="border-t border-white/10 pt-2 mt-1 flex justify-between text-white font-semibold">
                  <span>Total</span><span className="text-cyan-400">PKR 650</span>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 w-full py-4">
              {loading
                ? <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                : <><span>Submit & Proceed to AI Verify</span><ChevronRight size={18}/></>}
            </button>
            <p className="text-white/30 text-xs text-center">
              By submitting, you confirm that all provided information is accurate and truthful.
            </p>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}
