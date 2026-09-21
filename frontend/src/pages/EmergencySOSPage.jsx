import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { incidentsAPI } from '../api/apiClient';
import { AlertTriangle, MapPin, Phone, Send, CheckCircle2, ShieldAlert, Navigation, Loader2 } from 'lucide-react';

export default function EmergencySOSPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    emergency_type: 'CRIME_IN_PROGRESS',
    contact_number: '',
    location_address: '',
    latitude: null,
    longitude: null,
    description: '',
  });

  const categories = [
    { id: 'CRIME_IN_PROGRESS', label: 'Crime in Progress', desc: 'Active robbery, burglary or violent incident' },
    { id: 'SNATCHING_ROBBERY', label: 'Snatching / Robbery', desc: 'Armed snatching or mobile robbery' },
    { id: 'HARASSMENT', label: 'Harassment / Women Safety', desc: 'Immediate physical or street threat' },
    { id: 'ROAD_ACCIDENT', label: 'Road Accident', desc: 'Collision or severe injury requiring immediate help' },
    { id: 'MEDICAL_EMERGENCY', label: 'Medical Emergency', desc: 'Critical medical trauma or collapse' },
    { id: 'FIRE_SAFETY', label: 'Fire Emergency', desc: 'Building or vehicle fire threat' },
    { id: 'OTHER', label: 'Other Urgent Emergency', desc: 'Any other life-threatening situation' },
  ];

  // Auto-fetch GPS on component mount
  useEffect(() => {
    fetchGPSLocation();
  }, []);

  const fetchGPSLocation = () => {
    if (!navigator.geolocation) {
      setError('Browser location service unavailable. Please enter address manually.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          location_address: prev.location_address || `GPS Coordinates: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
        }));
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        console.warn('GPS position error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.contact_number.trim()) {
      setError('Please provide a valid contact mobile number for emergency response.');
      return;
    }
    if (!formData.location_address.trim()) {
      setError('Please specify your current location address or landmark.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await incidentsAPI.sendSOS(formData);
      setSuccessData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to dispatch SOS alert. Please retry or contact emergency 15 directly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-28 pb-16 px-4 max-w-4xl mx-auto w-full">
        {/* Header Alert Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-950/80 border border-red-700/50 text-red-400 font-bold text-xs uppercase tracking-widest mb-3 animate-pulse">
            <ShieldAlert size={16} />
            <span>High-Priority Dispatch Channel</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black font-display text-white tracking-tight">
            EMERGENCY <span className="text-red-500">SOS ALERT</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
            Dispatches immediate alert to local police emergency control room with your live location coordinates.
          </p>
        </div>

        {successData ? (
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 size={44} />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                ALERT DISPATCHED TO CONTROL ROOM
              </span>
              <h2 className="text-2xl font-bold text-white mt-3">Emergency Alert Received!</h2>
              <p className="text-slate-300 text-sm mt-1 max-w-md mx-auto">
                Police response team has been notified. Keep your phone accessible.
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left max-w-md mx-auto space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Emergency Reference ID:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">{successData.sos_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Emergency Type:</span>
                <span className="font-semibold text-white">{successData.emergency_type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Status:</span>
                <span className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 font-bold uppercase text-[10px]">
                  {successData.status}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Location:</span>
                <span className="text-slate-200 text-right max-w-[200px] truncate">{successData.location_address}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                to={`/track?id=${successData.sos_id}`}
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-amber-500/20"
              >
                Track Dispatch Status
              </Link>
              <button
                onClick={() => setSuccessData(null)}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition border border-slate-700"
              >
                Send Another Alert
              </button>
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

            {/* Select Emergency Type */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                1. Select Emergency Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, emergency_type: cat.id })}
                    className={`p-3.5 rounded-2xl text-left border transition flex flex-col justify-between ${
                      formData.emergency_type === cat.id
                        ? 'bg-red-950/60 border-red-500 text-white shadow-lg shadow-red-950/50 ring-1 ring-red-500'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold text-sm text-white">{cat.label}</span>
                      <div className={`w-4 h-4 rounded-full border ${formData.emergency_type === cat.id ? 'border-red-400 bg-red-500' : 'border-slate-600'}`} />
                    </div>
                    <span className="text-xs text-slate-400 mt-1">{cat.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Location & GPS */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  2. Emergency Incident Location
                </label>
                <button
                  type="button"
                  onClick={fetchGPSLocation}
                  disabled={locating}
                  className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold transition"
                >
                  {locating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                  <span>{locating ? 'Acquiring GPS...' : 'Refetch GPS Coordinates'}</span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <MapPin size={18} />
                </div>
                <textarea
                  rows={2}
                  value={formData.location_address}
                  onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                  placeholder="Enter current address, landmark, area or street name..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 text-xs transition"
                  required
                />
              </div>
              {formData.latitude && (
                <p className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle2 size={12} /> Live GPS attached: Lat {formData.latitude.toFixed(5)}, Lng {formData.longitude.toFixed(5)}
                </p>
              )}
            </div>

            {/* Contact Mobile */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                3. Your Mobile Contact Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Phone size={18} />
                </div>
                <input
                  type="tel"
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  placeholder="e.g. 03001234567"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 text-xs transition"
                  required
                />
              </div>
            </div>

            {/* Quick Description */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                4. Brief Situation Details (Optional)
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Number of suspects, vehicle colors, active injury status..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 text-xs transition"
              />
            </div>

            {/* Submit SOS Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-red-950/60 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2 border border-red-400/30"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>DISPATCHING SOS ALERT...</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={20} className="text-amber-200" />
                  <span>DISPATCH EMERGENCY SOS NOW</span>
                </>
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
