import { useState } from 'react';
import { Search, AlertTriangle, CheckCircle, Shield, User, Calendar, MapPin, FileText, XCircle, Eye, EyeOff } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// ── Dummy Criminal Records Dataset ─────────────────────────────────────────
const DUMMY_RECORDS = [
  {
    id: 'CR-2024-0001', cnic: '35202-1234567-1', name: 'Ghulam Sarwar',
    father_name: 'Allah Ditta', dob: '1985-03-14', gender: 'Male',
    address: 'Village Chak 45, Sheikhupura, Punjab',
    crime_type: 'Armed Robbery', fir_number: 'FIR-456/2022',
    police_station: 'Sheikhupura Saddar PS', district: 'Sheikhupura',
    crime_severity: 'SERIOUS', is_wanted: false, is_blacklisted: true,
    arrest_date: '2022-08-10', release_date: null, status: 'CRIMINAL_MATCH',
    sentences: ['Convicted — 7 Years Rigorous Imprisonment (2022)', 'Previous: Theft FIR 2019'],
    description: 'Convicted for armed robbery at petrol station. Previously convicted for theft in 2019.',
  },
  {
    id: 'CR-2024-0002', cnic: '42301-9876543-2', name: 'Shahbaz Hussain',
    father_name: 'Manzoor Hussain', dob: '1990-11-22', gender: 'Male',
    address: 'Block 7, Gulshan-e-Iqbal, Karachi, Sindh',
    crime_type: 'Drug Trafficking', fir_number: 'FIR-891/2021',
    police_station: 'Gulshan PS', district: 'Karachi East',
    crime_severity: 'SERIOUS', is_wanted: true, is_blacklisted: true,
    arrest_date: '2021-06-15', release_date: null, status: 'CRIMINAL_MATCH',
    sentences: ['Wanted — Absconded during trial (2023)'],
    description: 'Alleged kingpin in drug trafficking network. Currently absconded and wanted by Karachi CTD.',
  },
  {
    id: 'CR-2024-0003', cnic: '34101-5551234-3', name: 'Pervez Khan',
    father_name: 'Asghar Khan', dob: '1978-07-05', gender: 'Male',
    address: 'Street 12, Hayatabad Phase 4, Peshawar, KPK',
    crime_type: 'Vehicle Theft', fir_number: 'FIR-223/2023',
    police_station: 'Hayatabad PS', district: 'Peshawar',
    crime_severity: 'MINOR', is_wanted: false, is_blacklisted: false,
    arrest_date: '2023-02-20', release_date: '2023-11-15', status: 'SUSPECTED',
    sentences: ['Acquitted — Insufficient Evidence (2023)'],
    description: 'Suspect in vehicle theft ring. Acquitted due to insufficient evidence.',
  },
  {
    id: 'CR-2024-0004', cnic: '38403-7654321-4', name: 'Rashid Mehmood',
    father_name: 'Khalid Mehmood', dob: '1982-12-30', gender: 'Male',
    address: 'Satellite Town Block C, Rawalpindi, Punjab',
    crime_type: 'Fraud / Cheque Bounce', fir_number: 'FIR-102/2024',
    police_station: 'Rawalpindi Cantt PS', district: 'Rawalpindi',
    crime_severity: 'MINOR', is_wanted: false, is_blacklisted: false,
    arrest_date: '2024-01-08', release_date: '2024-03-10', status: 'SUSPECTED',
    sentences: ['Bail granted — Trial pending (2024)'],
    description: 'Accused of financial fraud and cheque dishonour amounting to PKR 2.5 Million.',
  },
  {
    id: 'CR-2024-0005', cnic: '35401-1122334-5', name: 'Zulfiqar Ali',
    father_name: 'Noor Muhammad', dob: '1975-04-18', gender: 'Male',
    address: 'Mohalla Islamabad, Multan Cantt, Punjab',
    crime_type: 'Land Grabbing / Extortion', fir_number: 'FIR-778/2020',
    police_station: 'Multan Cantt PS', district: 'Multan',
    crime_severity: 'SERIOUS', is_wanted: false, is_blacklisted: true,
    arrest_date: '2020-09-25', release_date: null, status: 'CRIMINAL_MATCH',
    sentences: ['Convicted — 5 Years + PKR 500,000 Fine (2021)'],
    description: 'Convicted for illegal land grabbing and extortion of local farmers.',
  },
  {
    id: 'CR-2024-0006', cnic: '36502-4433221-6', name: 'Imtiaz Butt',
    father_name: 'Ghulam Nabi Butt', dob: '1969-09-09', gender: 'Male',
    address: 'Mohallah Kot Lakhpat, Lahore, Punjab',
    crime_type: 'Cyber Crime / Bank Fraud', fir_number: 'FIR-55/2023',
    police_station: 'FIA Cybercrime Wing, Lahore', district: 'Lahore',
    crime_severity: 'SERIOUS', is_wanted: true, is_blacklisted: true,
    arrest_date: null, release_date: null, status: 'CRIMINAL_MATCH',
    sentences: ['RED NOTICE ISSUED — International fugitive'],
    description: 'Alleged mastermind of online banking fraud exceeding PKR 80 Million. INTERPOL Red Notice issued.',
  },
];

const SEVERITY_CONFIG = {
  SERIOUS:  { label: 'Serious Offence', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  MINOR:    { label: 'Minor Offence',   color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  NONE:     { label: 'No Record',       color: 'text-green-400 bg-green-500/10 border-green-500/30' },
};

export default function CriminalRecordsPage() {
  const [query, setQuery]           = useState('');
  const [searchType, setSearchType] = useState('cnic');  // 'cnic' | 'name'
  const [results, setResults]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [expanded, setExpanded]     = useState(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResults(null);
    setExpanded(null);

    setTimeout(() => {
      const q = query.trim().toLowerCase();
      const found = DUMMY_RECORDS.filter((r) =>
        searchType === 'cnic'
          ? r.cnic.replace(/-/g, '').includes(q.replace(/-/g, ''))
          : r.name.toLowerCase().includes(q) || r.father_name.toLowerCase().includes(q)
      );
      setResults(found);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar />

      {/* ── Header ── */}
      <section className="relative pt-28 pb-12 border-b border-slate-800 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-950/30 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Shield size={14} />
            Restricted Access — Law Enforcement Database
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Criminal Records <span className="text-orange-400">Database</span>
          </h1>
          <p className="text-slate-400 text-base max-w-2xl mb-2">
            Search the national criminal database by CNIC number or full name. This system is powered by Pakistan Police & FIA central records for background verification purposes.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            {['🔐 Encrypted Queries', '📋 FIR Linked Records', '⚡ Real-time Lookup', '🏛️ Court-Verified Data'].map((t, i) => (
              <span key={i} className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700/60 text-slate-400 text-xs font-medium">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Search Form ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 w-full">
        <form onSubmit={handleSearch} className="bg-slate-900/60 border border-slate-700/60 rounded-3xl p-8 shadow-xl backdrop-blur-md">
          <h2 className="text-white font-bold text-lg mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            🔍 Search Criminal Database
          </h2>

          {/* Search Type Toggle */}
          <div className="flex gap-2 mb-6">
            {[['cnic', '🪪 By CNIC Number'], ['name', '👤 By Name']].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => { setSearchType(val); setQuery(''); setResults(null); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all duration-200 ${
                  searchType === val
                    ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="criminal-search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchType === 'cnic' ? 'Enter CNIC (e.g. 35202-1234567-1)' : 'Enter full name or father name'}
                className="w-full pl-12 pr-4 py-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/60 focus:bg-slate-800 transition-all text-sm"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              />
            </div>
            <button
              type="submit"
              id="criminal-search-btn"
              disabled={loading || !query.trim()}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-red-700 text-white font-black text-sm uppercase tracking-wider hover:from-orange-500 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-orange-900/30"
            >
              {loading ? '...' : 'Search'}
            </button>
          </div>

          {/* Demo tip */}
          <p className="text-slate-600 text-xs mt-4">
            💡 Demo: Try CNIC <code className="text-orange-400 font-mono">35202-1234567-1</code> or name <code className="text-orange-400 font-mono">Ghulam</code>
          </p>
        </form>

        {/* ── Loading ── */}
        {loading && (
          <div className="mt-8 flex flex-col items-center justify-center gap-4 py-16">
            <div className="w-14 h-14 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Querying national criminal database…</p>
          </div>
        )}

        {/* ── No Results ── */}
        {results !== null && !loading && results.length === 0 && (
          <div className="mt-8 bg-emerald-900/20 border border-emerald-500/30 rounded-3xl p-10 text-center">
            <CheckCircle size={48} className="text-emerald-400 mx-auto mb-4" />
            <h3 className="text-emerald-300 font-black text-xl mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              ✅ No Criminal Record Found
            </h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              The search query <strong className="text-white">"{query}"</strong> returned no records in the national criminal database. This individual appears to have a clean record.
            </p>
          </div>
        )}

        {/* ── Results ── */}
        {results && results.length > 0 && !loading && (
          <div className="mt-8 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle size={20} className="text-red-400" />
              <h3 className="text-red-300 font-bold text-base">
                {results.length} Record{results.length > 1 ? 's' : ''} Found — Classified Information
              </h3>
            </div>

            {results.map((rec) => {
              const sev = SEVERITY_CONFIG[rec.crime_severity] || SEVERITY_CONFIG.NONE;
              const isOpen = expanded === rec.id;
              return (
                <div
                  key={rec.id}
                  className="bg-slate-900/80 border border-red-500/20 rounded-3xl overflow-hidden shadow-xl hover:border-red-500/40 transition-all duration-200"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between p-6 border-b border-slate-800/60">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-900/60 to-orange-900/60 border border-red-500/30 flex items-center justify-center">
                        <User size={26} className="text-red-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-white font-black text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            {rec.name}
                          </h4>
                          {rec.is_wanted && (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-black uppercase tracking-widest animate-pulse">
                              🚨 WANTED
                            </span>
                          )}
                          {rec.is_blacklisted && (
                            <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-[10px] font-bold uppercase tracking-wider">
                              ⛔ BLACKLISTED
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-sm mt-0.5">
                          Father: <span className="text-slate-300 font-medium">{rec.father_name}</span>
                          <span className="mx-2 text-slate-700">·</span>
                          CNIC: <span className="text-slate-300 font-mono font-medium">{rec.cnic}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-xl border text-xs font-bold ${sev.color}`}>
                        {sev.label}
                      </span>
                      <button
                        onClick={() => setExpanded(isOpen ? null : rec.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-300 hover:text-white text-xs font-semibold transition-all"
                      >
                        {isOpen ? <><EyeOff size={14} /> Hide</> : <><Eye size={14} /> View Details</>}
                      </button>
                    </div>
                  </div>

                  {/* Summary Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-slate-950/40">
                    {[
                      { icon: FileText, label: 'Crime Type', value: rec.crime_type },
                      { icon: MapPin, label: 'Police Station', value: rec.police_station },
                      { icon: Calendar, label: 'Arrest Date', value: rec.arrest_date || 'N/A' },
                      { icon: Shield, label: 'FIR Number', value: rec.fir_number },
                    ].map(({ icon: Icon, label, value }, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <Icon size={15} className="text-orange-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">{label}</p>
                          <p className="text-slate-200 text-xs font-semibold mt-0.5">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Expanded Detail */}
                  {isOpen && (
                    <div className="p-6 bg-slate-950/60 border-t border-slate-800/40 space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-3">
                          <h5 className="text-orange-300 font-bold text-xs uppercase tracking-widest">Personal Details</h5>
                          {[
                            ['Date of Birth', rec.dob],
                            ['Gender', rec.gender],
                            ['Address', rec.address],
                            ['District', rec.district],
                          ].map(([k, v]) => (
                            <div key={k} className="flex justify-between items-start gap-4 py-2 border-b border-slate-800/40">
                              <span className="text-slate-500 text-xs shrink-0">{k}</span>
                              <span className="text-slate-200 text-xs text-right font-medium">{v}</span>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-3">
                          <h5 className="text-red-300 font-bold text-xs uppercase tracking-widest">Criminal History</h5>
                          {rec.sentences.map((s, i) => (
                            <div key={i} className="flex items-start gap-2 bg-red-900/10 border border-red-500/20 rounded-xl p-3">
                              <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                              <p className="text-slate-300 text-xs">{s}</p>
                            </div>
                          ))}
                          <div className="mt-2 bg-slate-900/60 border border-slate-700/40 rounded-xl p-3">
                            <p className="text-slate-400 text-xs leading-relaxed">{rec.description}</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-slate-600 text-[10px] border-t border-slate-800/40 pt-4">
                        Record ID: {rec.id} · Last Updated: 2026-08-13 · Source: Punjab Police Central Database
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Disclaimer ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-12 w-full">
        <div className="bg-slate-900/40 border border-yellow-600/20 rounded-2xl p-5 flex items-start gap-4">
          <AlertTriangle size={20} className="text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-slate-400 text-xs leading-relaxed">
            <strong className="text-yellow-300">Legal Disclaimer:</strong> This system contains sensitive law enforcement data. Unauthorized access, misuse, or sharing of this information is a criminal offence under the Pakistan Electronic Crime Act (PECA) 2016 and PPC Section 504. All queries are logged and audited.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
