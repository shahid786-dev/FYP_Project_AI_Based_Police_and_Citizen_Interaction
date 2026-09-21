import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Database, Shield, CheckCircle, XCircle, AlertTriangle, Search, Activity, Hash, Clock } from 'lucide-react';
import { blockchainAPI } from '../api/apiClient';

export default function BlockchainExplorer() {
  const [blocks, setBlocks]       = useState([]);
  const [integrity, setIntegrity] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [searchId, setSearchId]   = useState('');
  const [history, setHistory]     = useState(null);
  const [histLoading, setHistLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  useEffect(() => {
    Promise.all([
      blockchainAPI.blocks().then(r => setBlocks(Array.isArray(r.data) ? r.data : r.data.results || [])),
      blockchainAPI.verify().then(r => setIntegrity(r.data)),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    setHistLoading(true);
    try {
      const r = await blockchainAPI.recordHistory(searchId.trim());
      setHistory(Array.isArray(r.data) ? r.data : r.data.results || []);
    } catch { setHistory([]); }
    finally { setHistLoading(false); }
  };

  const ACTION_COLOR = {
    GENESIS:'text-white/50', CITIZEN_REGISTER:'text-blue-400', APPLICATION_SUBMIT:'text-cyan-400',
    AI_FACE_VERIFY:'text-purple-400', NADRA_VERIFY:'text-indigo-400', CRIMINAL_CHECK:'text-orange-400',
    STAFF_REVIEW:'text-yellow-400', AUTHORITY_APPROVE:'text-green-400', AUTHORITY_REJECT:'text-red-400',
    CHALLAN_GENERATE:'text-pink-400', PAYMENT_CONFIRM:'text-emerald-400',
    CERTIFICATE_ISSUE:'text-cyan-300', CERTIFICATE_DOWNLOAD:'text-teal-400',
    DOCUMENT_UPLOAD:'text-sky-400', RECORD_MODIFY:'text-amber-400',
  };

  const displayed = blocks.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const totalPages = Math.ceil(blocks.length / PER_PAGE);

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* Topbar */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Database size={18} className="text-white"/>
          </div>
          <div>
            <p className="text-white font-bold">PakVerify Blockchain Explorer</p>
            <p className="text-white/40 text-xs">Immutable ledger — SHA-256 hash chain</p>
          </div>
        </div>
        <Link to="/" className="text-white/40 text-sm hover:text-white transition">← Back to Portal</Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Integrity Banner */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <svg className="animate-spin h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        ) : integrity && (
          <div className={`rounded-2xl border p-6 flex items-start gap-5 ${integrity.valid ? 'bg-green-400/5 border-green-400/30' : 'bg-red-400/5 border-red-400/30'}`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${integrity.valid ? 'bg-green-400/20' : 'bg-red-400/20'}`}>
              {integrity.valid ? <Shield size={28} className="text-green-400"/> : <AlertTriangle size={28} className="text-red-400"/>}
            </div>
            <div className="flex-1">
              <p className={`text-xl font-bold ${integrity.valid ? 'text-green-400' : 'text-red-400'}`}>
                {integrity.valid ? '✓ Blockchain Integrity Verified' : '⚠ Chain Integrity Compromised'}
              </p>
              <p className="text-white/60 text-sm mt-1">
                {integrity.total_blocks} blocks in chain · {integrity.valid ? 'All hashes valid — no tampering detected' : `${integrity.issues?.length} issue(s) found`}
              </p>
              {!integrity.valid && integrity.issues?.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1">
                  {integrity.issues.map((issue, i) => (
                    <li key={i} className="text-red-400 text-sm flex items-center gap-2"><XCircle size={13}/>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label:'Total Blocks', value: blocks.length, color:'text-cyan-400' },
            { label:'Certificates', value: blocks.filter(b=>b.action_type==='CERTIFICATE_ISSUE').length, color:'text-green-400' },
            { label:'AI Verifications', value: blocks.filter(b=>b.action_type==='AI_FACE_VERIFY').length, color:'text-purple-400' },
            { label:'Payments', value: blocks.filter(b=>b.action_type==='PAYMENT_CONFIRM').length, color:'text-yellow-400' },
          ].map((s,i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-white/40 text-xs mb-1">{s.label}</p>
              <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Record History Search */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Search size={16} className="text-cyan-400"/> Record History Search
          </h2>
          <p className="text-white/40 text-sm mb-4">Enter an Application ID to view all blockchain events for that record.</p>
          <div className="flex gap-3">
            <input value={searchId} onChange={e => setSearchId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Application ID (number)…"
              className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/50 font-mono text-sm"/>
            <button onClick={handleSearch} disabled={histLoading || !searchId.trim()}
              className="bg-cyan-400 text-[#0a1628] font-bold px-6 rounded-xl text-sm hover:bg-cyan-300 transition disabled:opacity-40">
              {histLoading ? '…' : 'Search'}
            </button>
          </div>

          {history !== null && (
            <div className="mt-5">
              {history.length === 0 ? (
                <p className="text-white/30 text-sm">No blockchain records found for this ID.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-white/50 text-xs mb-2">{history.length} block(s) found for record ID: {searchId}</p>
                  {history.map((b, i) => (
                    <div key={i} className="bg-white/3 border border-white/10 rounded-xl p-4 flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-cyan-400 text-xs font-mono">#{b.block_index}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${ACTION_COLOR[b.action_type] || 'text-white/60'}`}>{b.action_type.replace(/_/g,' ')}</span>
                          <span className="text-white/30 text-xs">{new Date(b.timestamp).toLocaleString('en-PK')}</span>
                        </div>
                        <p className="text-white/40 text-xs font-mono mt-1 truncate">Hash: {b.current_hash}</p>
                        <p className="text-white/30 text-xs font-mono">By: {b.performed_by}</p>
                      </div>
                      <CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5"/>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Full Block List */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Activity size={16} className="text-cyan-400"/> Block Ledger
            </h2>
            <p className="text-white/40 text-xs">{blocks.length} total blocks</p>
          </div>

          {/* Table header */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 text-white/30 text-xs border-b border-white/10 mb-2">
            <span className="col-span-1">#</span>
            <span className="col-span-3">Action</span>
            <span className="col-span-3">Hash (truncated)</span>
            <span className="col-span-2">By</span>
            <span className="col-span-3">Timestamp</span>
          </div>

          <div className="flex flex-col gap-1">
            {displayed.map((b, i) => (
              <div key={i} className="grid md:grid-cols-12 gap-2 items-center px-4 py-3 rounded-xl hover:bg-white/5 transition text-sm border border-transparent hover:border-white/10">
                <span className="md:col-span-1 text-white/30 font-mono text-xs">#{b.block_index}</span>
                <span className={`md:col-span-3 font-medium text-xs ${ACTION_COLOR[b.action_type] || 'text-white/60'}`}>{b.action_type.replace(/_/g,' ')}</span>
                <div className="md:col-span-3 flex items-center gap-1.5">
                  <Hash size={11} className="text-white/20 flex-shrink-0"/>
                  <span className="text-white/40 font-mono text-xs truncate">{b.current_hash?.slice(0,16)}…</span>
                </div>
                <span className="md:col-span-2 text-white/40 font-mono text-xs truncate">{b.performed_by?.slice(0,12)}</span>
                <div className="md:col-span-3 flex items-center gap-1.5">
                  <Clock size={11} className="text-white/20 flex-shrink-0"/>
                  <span className="text-white/40 text-xs">{new Date(b.timestamp).toLocaleString('en-PK',{dateStyle:'short',timeStyle:'short'})}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}
                className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-sm disabled:opacity-30 hover:bg-white/10 transition">
                ← Prev
              </button>
              <span className="text-white/40 text-sm">Page {page} / {totalPages}</span>
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}
                className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-sm disabled:opacity-30 hover:bg-white/10 transition">
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
