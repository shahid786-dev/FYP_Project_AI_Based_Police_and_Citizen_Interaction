import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { incidentsAPI } from '../api/apiClient';
import { Shield, FileText, Upload, CheckCircle2, AlertTriangle, MapPin, Calendar, Clock, DollarSign, UserCheck, Loader2 } from 'lucide-react';

export default function ReportCrimePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);

  const [formData, setFormData] = useState({
    category: 'SNATCHING',
    title: '',
    description: '',
    incident_date: new Date().toISOString().split('T')[0],
    incident_time: '12:00',
    location_address: '',
    district: 'Lahore',
    nearest_station: 'Central Police Station',
    priority: 'HIGH',
    suspect_details: '',
    stolen_items_value: '',
    witness_info: '',
  });

  const categories = [
    { id: 'SNATCHING', label: 'Mobile / Purse Snatching' },
    { id: 'ROBBERY', label: 'Armed Robbery' },
    { id: 'THEFT', label: 'Vehicle / Property Theft' },
    { id: 'HARASSMENT', label: 'Harassment / Stalking' },
    { id: 'OTHER', label: 'General Crime / Threat' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim() || !formData.location_address.trim()) {
      setError('Please fill in all required crime report details.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await incidentsAPI.createComplaint(formData);
      const complaint = res.data;

      // Upload evidence if attached
      if (evidenceFile && complaint.id) {
        const fd = new FormData();
        fd.append('complaint', complaint.id);
        fd.append('file', evidenceFile);
        fd.append('file_type', 'IMAGE');
        fd.append('description', 'Citizen attached evidence image');
        await incidentsAPI.uploadEvidence(fd);
      }

      setSuccessData(complaint);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit crime report. Ensure you are logged in as a registered citizen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-28 pb-16 px-4 max-w-4xl mx-auto w-full">
        <div className="text-center mb-8">
          <span className="px-3 py-1 rounded-full bg-blue-950 text-blue-400 font-semibold text-xs uppercase tracking-wider border border-blue-800/40">
            Digital Crime Registration Desk
          </span>
          <h1 className="text-3xl md:text-5xl font-black font-display text-white mt-3 tracking-tight">
            REPORT A <span className="text-amber-400">CRIME / INCIDENT</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
            Submit formal police complaints for snatching, theft, robbery, or criminal threats directly to district police.
          </p>
        </div>

        {successData ? (
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 size={44} />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                COMPLAINT REGISTERED SUCCESSFULLY
              </span>
              <h2 className="text-2xl font-bold text-white mt-3">Complaint Reference Created!</h2>
              <p className="text-slate-300 text-sm mt-1 max-w-md mx-auto">
                Your report has been logged and assigned to the relevant district station for investigation.
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left max-w-md mx-auto space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Complaint Tracking ID:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">{successData.complaint_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Title:</span>
                <span className="font-semibold text-white">{successData.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Status:</span>
                <span className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 font-bold uppercase text-[10px]">
                  {successData.status}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                to={`/track?id=${successData.complaint_id}`}
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-amber-500/20"
              >
                Track Complaint Timeline
              </Link>
              <Link
                to="/citizen/dashboard"
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition border border-slate-700"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-950/80 border border-red-600/50 text-red-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Category selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Incident Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: c.id })}
                    className={`p-3 rounded-xl text-xs font-bold transition border ${
                      formData.category === c.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title & Priority */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Complaint Title / Short Subject *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. iPhone 14 Snatched near Gulberg Main Market"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs transition"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Priority Level
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 text-xs transition"
                >
                  <option value="LOW">Low Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="CRITICAL">Critical Priority</option>
                </select>
              </div>
            </div>

            {/* Date, Time, Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Calendar size={14} /> Incident Date
                </label>
                <input
                  type="date"
                  value={formData.incident_date}
                  onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 text-xs transition"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Clock size={14} /> Incident Time
                </label>
                <input
                  type="time"
                  value={formData.incident_time}
                  onChange={(e) => setFormData({ ...formData, incident_time: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 text-xs transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  District / City
                </label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 text-xs transition"
                />
              </div>
            </div>

            {/* Detailed Location */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                <MapPin size={14} /> Detailed Incident Address / Location *
              </label>
              <textarea
                rows={2}
                value={formData.location_address}
                onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                placeholder="Street address, nearest shop, landmark or intersection..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs transition"
                required
              />
            </div>

            {/* Detailed Description */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Detailed Description of Crime *
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Explain sequence of events, weapon used (if any), directions suspects fled..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs transition"
                required
              />
            </div>

            {/* Stolen items & Suspect info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <DollarSign size={14} /> Stolen Items & Estimated Value
                </label>
                <input
                  type="text"
                  value={formData.stolen_items_value}
                  onChange={(e) => setFormData({ ...formData, stolen_items_value: e.target.value })}
                  placeholder="e.g. Wallet, CNIC, PKR 25,000 Cash"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Suspect Description / Vehicle Info
                </label>
                <input
                  type="text"
                  value={formData.suspect_details}
                  onChange={(e) => setFormData({ ...formData, suspect_details: e.target.value })}
                  placeholder="e.g. 2 males on Black Honda 125, height ~5'10"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs transition"
                />
              </div>
            </div>

            {/* Evidence File Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Upload size={14} /> Upload Evidence / Photo / CCTV Screenshot (Optional)
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setEvidenceFile(e.target.files[0])}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 text-xs file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-amber-400 hover:file:bg-slate-700"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>REGISTERING COMPLAINT...</span>
                </>
              ) : (
                <>
                  <Shield size={18} />
                  <span>SUBMIT POLICE COMPLAINT</span>
                </>
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
