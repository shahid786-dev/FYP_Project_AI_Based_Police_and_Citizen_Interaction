import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { incidentsAPI } from '../api/apiClient';
import { Shield, Ambulance, Heart, CheckCircle2, AlertTriangle, Upload, UserCheck, Loader2 } from 'lucide-react';

export default function AccidentAssistancePage() {
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);

  const [formData, setFormData] = useState({
    category: 'ACCIDENT',
    title: 'Road Accident Assistance Request',
    description: '',
    incident_date: new Date().toISOString().split('T')[0],
    location_address: '',
    district: 'Lahore',
    priority: 'HIGH',
    stolen_items_value: '', // used here for vehicle info
    witness_info: '',
    is_helper_witness: true,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.location_address.trim()) {
      setError('Please provide the accident location and basic description.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await incidentsAPI.createComplaint({ ...formData, category: 'ACCIDENT' });
      const complaint = res.data;

      if (evidenceFile && complaint.id) {
        const fd = new FormData();
        fd.append('complaint', complaint.id);
        fd.append('file', evidenceFile);
        fd.append('file_type', 'IMAGE');
        fd.append('description', 'Accident scene evidence photo');
        await incidentsAPI.uploadEvidence(fd);
      }

      setSuccessData(complaint);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to dispatch accident assistance request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-28 pb-16 px-4 max-w-4xl mx-auto w-full">
        {/* Reassurance Banner */}
        <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-3xl p-6 mb-8 text-center shadow-xl">
          <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
            <Heart size={16} />
            <span>Citizen Good Samaritan Facilitation</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white">
            Helping Injured Persons Is Safe & Facilitated
          </h2>
          <p className="text-slate-300 text-xs mt-1 max-w-lg mx-auto">
            This platform facilitates emergency dispatch and assistance. Helping an accident victim is a heroic act. Helper/witness reports are maintained separately from suspect profiles.
          </p>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 font-bold text-xs uppercase tracking-widest mb-3">
            <Ambulance size={16} />
            <span>Emergency Road Incident Desk</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black font-display text-white tracking-tight">
            ACCIDENT <span className="text-emerald-400">ASSISTANCE</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
            Report vehicle collisions, injured citizens, or highway accidents for immediate emergency service coordination.
          </p>
        </div>

        {successData ? (
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 size={44} />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                ACCIDENT REPORT DISPATCHED
              </span>
              <h2 className="text-2xl font-bold text-white mt-3">Emergency Unit Notified!</h2>
              <p className="text-slate-300 text-sm mt-1 max-w-md mx-auto">
                Accident dispatch log reference: <strong>{successData.complaint_id}</strong>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                to={`/track?id=${successData.complaint_id}`}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20"
              >
                Track Unit Dispatch
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

            {/* Reporter Role Choice */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Your Role in This Incident
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_helper_witness: true })}
                  className={`p-3.5 rounded-xl text-xs font-bold transition border text-left ${
                    formData.is_helper_witness
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <p className="text-sm font-bold text-white">🤝 I am Providing Assistance / Witness</p>
                  <p className="text-[11px] text-slate-400 font-normal mt-0.5">I am helping an injured person or reporting as a bystander.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_helper_witness: false })}
                  className={`p-3.5 rounded-xl text-xs font-bold transition border text-left ${
                    !formData.is_helper_witness
                      ? 'bg-blue-950/80 border-blue-500 text-blue-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <p className="text-sm font-bold text-white">🚗 Involved Vehicle / Person</p>
                  <p className="text-[11px] text-slate-400 font-normal mt-0.5">I am directly involved in the accident.</p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Accident Location / Landmark *
              </label>
              <input
                type="text"
                value={formData.location_address}
                onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                placeholder="Highway number, underpass, shop landmark or road name..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Situation & Injury Details *
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Number of injured persons, condition, vehicles involved (car, bike, truck)..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs transition"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Vehicle Registration / Details
                </label>
                <input
                  type="text"
                  value={formData.stolen_items_value}
                  onChange={(e) => setFormData({ ...formData, stolen_items_value: e.target.value })}
                  placeholder="e.g. White Corolla LE-20-4921, Red Honda 125"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Witness / Contact Notes
                </label>
                <input
                  type="text"
                  value={formData.witness_info}
                  onChange={(e) => setFormData({ ...formData, witness_info: e.target.value })}
                  placeholder="Voluntary contact info or witness notes..."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Upload size={14} /> Upload Scene Photo / Evidence (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setEvidenceFile(e.target.files[0])}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 text-xs file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-emerald-300 hover:file:bg-slate-700"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>DISPATCHING ACCIDENT ASSISTANCE...</span>
                </>
              ) : (
                <>
                  <Ambulance size={18} />
                  <span>DISPATCH EMERGENCY ACCIDENT HELP</span>
                </>
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
