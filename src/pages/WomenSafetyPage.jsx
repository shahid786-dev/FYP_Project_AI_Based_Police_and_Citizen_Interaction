import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { incidentsAPI } from '../api/apiClient';
import { Shield, HeartHandshake, AlertTriangle, Lock, Upload, CheckCircle2, PhoneCall, Loader2 } from 'lucide-react';

export default function WomenSafetyPage() {
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);

  const [formData, setFormData] = useState({
    category: 'HARASSMENT',
    title: '',
    description: '',
    incident_date: new Date().toISOString().split('T')[0],
    location_address: '',
    district: 'Lahore',
    priority: 'HIGH',
    suspect_details: '',
  });

  const categories = [
    'Street Harassment',
    'Stalking',
    'Workplace Harassment',
    'Unwanted Calls / Messages',
    'Online / Social Media Harassment',
    'Public Place Incident',
    'Other Threat',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim() || !formData.location_address.trim()) {
      setError('Please fill in required harassment complaint details.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await incidentsAPI.createComplaint({ ...formData, category: 'HARASSMENT' });
      const complaint = res.data;

      if (evidenceFile && complaint.id) {
        const fd = new FormData();
        fd.append('complaint', complaint.id);
        fd.append('file', evidenceFile);
        fd.append('file_type', 'IMAGE');
        fd.append('description', 'Women safety attached evidence');
        await incidentsAPI.uploadEvidence(fd);
      }

      setSuccessData(complaint);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report. Please log in or retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-28 pb-16 px-4 max-w-4xl mx-auto w-full">
        {/* Urgent Emergency SOS Banner */}
        <div className="bg-gradient-to-r from-red-950 via-pink-950 to-purple-950 border border-pink-700/40 rounded-3xl p-6 mb-8 text-center shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            <span className="px-3 py-1 rounded-full bg-red-900/80 text-red-200 text-xs font-black uppercase tracking-wider mb-2 border border-red-500/40">
              Immediate Safety Hazard?
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white font-display">
              Are you in immediate danger right now?
            </h2>
            <p className="text-slate-300 text-xs mt-1 max-w-md">
              Do not fill this form if you require immediate dispatch. Press below for instant location emergency response.
            </p>
            <Link
              to="/emergency-sos"
              className="mt-4 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-pink-600 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-red-900/50 hover:scale-105 active:scale-95 transition border border-pink-400/30 flex items-center gap-2 animate-pulse"
            >
              <AlertTriangle size={18} />
              <span>🚨 TRIGGER IMMEDIATE DANGER SOS</span>
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-950/80 border border-pink-700/50 text-pink-300 font-bold text-xs uppercase tracking-widest mb-3">
            <HeartHandshake size={16} />
            <span>Protected & Confidential Protection Unit</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black font-display text-white tracking-tight">
            WOMEN SAFETY & <span className="text-pink-400">HARASSMENT DESK</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
            Report harassment, stalking, or unwanted threats safely. Victim identity and evidence are strictly protected with role-based access.
          </p>
        </div>

        {/* Confidentiality Callout */}
        <div className="bg-slate-900/80 border border-pink-900/40 rounded-2xl p-4 mb-6 flex items-center gap-3 text-xs text-pink-200">
          <Lock size={20} className="text-pink-400 shrink-0" />
          <span>
            <strong>Strict Confidentiality:</strong> Details reported here are only accessible to designated authority desk officers.
          </span>
        </div>

        {successData ? (
          <div className="bg-slate-900 border border-pink-500/40 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center mx-auto border border-pink-500/40">
              <CheckCircle2 size={44} />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full bg-pink-950 text-pink-300 text-xs font-bold uppercase tracking-wider">
                HARASSMENT COMPLAINT REGISTERED
              </span>
              <h2 className="text-2xl font-bold text-white mt-3">Confidential Case Created!</h2>
              <p className="text-slate-300 text-sm mt-1 max-w-md mx-auto">
                Your report is logged with high priority under reference ID below.
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left max-w-md mx-auto space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Complaint ID:</span>
                <span className="font-mono font-bold text-pink-400 text-sm">{successData.complaint_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Subject:</span>
                <span className="font-semibold text-white">{successData.title}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                to={`/track?id=${successData.complaint_id}`}
                className="px-6 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-sm transition shadow-lg shadow-pink-900/30"
              >
                Track Case Progress
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

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Type of Harassment / Incident *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Stalking & Unwanted Phone Calls near College Campus"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500 text-xs transition"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Incident Date
                </label>
                <input
                  type="date"
                  value={formData.incident_date}
                  onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-pink-500 text-xs transition"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  District / Area
                </label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-pink-500 text-xs transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Location / Address of Incident *
              </label>
              <input
                type="text"
                value={formData.location_address}
                onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                placeholder="Street address, workplace, public transport station..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500 text-xs transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Detailed Incident Description *
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what occurred, frequency of harassment, phone numbers involved..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500 text-xs transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Harasser / Suspect Details (If Known)
              </label>
              <input
                type="text"
                value={formData.suspect_details}
                onChange={(e) => setFormData({ ...formData, suspect_details: e.target.value })}
                placeholder="Name, phone number, workplace, or physical description..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500 text-xs transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Upload size={14} /> Attach Evidence Screenshot / Audio / Photo (Optional)
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setEvidenceFile(e.target.files[0])}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 text-xs file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-pink-300 hover:file:bg-slate-700"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-700 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-pink-950/50 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>SUBMITTING REPORT...</span>
                </>
              ) : (
                <>
                  <Shield size={18} />
                  <span>SUBMIT CONFIDENTIAL REPORT</span>
                </>
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
