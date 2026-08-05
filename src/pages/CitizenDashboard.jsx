import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FileText, Clock, CheckCircle, AlertCircle, PlusCircle, Download, Search } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { applicationAPI } from '../api/apiClient';
import { setApplications } from '../store/applicationSlice';

const STATUS_STYLE = {
  PENDING:        'status-pending',
  UNDER_REVIEW:   'status-review',
  FACE_VERIFIED:  'status-review',
  CRIMINAL_CHECK: 'status-review',
  PAYMENT_PENDING:'status-pending',
  APPROVED:       'status-approved',
  REJECTED:       'status-rejected',
  COMPLETED:      'status-approved',
};

export default function CitizenDashboard() {
  const navigate   = useNavigate();
  const dispatch   = useDispatch();
  const { user }   = useSelector(s => s.auth);
  const { applications } = useSelector(s => s.application);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState('');

  useEffect(() => {
    applicationAPI.list()
      .then(res => { dispatch(setApplications(res.data)); })
      .catch(() => setError('Could not load applications. Backend may not be running.'))
      .finally(() => setLoading(false));
  }, [dispatch]);

  const stats = [
    { label: 'Total Applications', value: applications.length, icon: FileText, color: 'text-cyan-400' },
    { label: 'Under Review',       value: applications.filter(a => a.status === 'UNDER_REVIEW').length, icon: Clock, color: 'text-yellow-400' },
    { label: 'Completed',          value: applications.filter(a => a.status === 'COMPLETED').length, icon: CheckCircle, color: 'text-green-400' },
    { label: 'Rejected',           value: applications.filter(a => a.status === 'REJECTED').length, icon: AlertCircle, color: 'text-red-400' },
  ];

  const handleDownload = async (app) => {
    try {
      const res = await applicationAPI.downloadCert(app.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Certificate_${app.tracking_id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Certificate not issued yet. Application must be COMPLETED first.');
    }
  };

  return (
    <DashboardLayout role="citizen" userName={user?.full_name || 'Citizen'}>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Welcome, {user?.full_name?.split(' ')[0] || 'Citizen'} 👋
          </h1>
          <p className="text-white/50 mt-1 text-sm">Manage your police verification requests</p>
        </div>
        <button onClick={() => navigate('/citizen/request')}
          className="btn-primary flex items-center gap-2">
          <PlusCircle size={18} /> New Application
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
          <div key={i} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <s.icon size={20} className={s.color} />
              <span className="text-white/50 text-xs">{s.label}</span>
            </div>
            <p className={`text-3xl font-bold font-display ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="glass-card p-4 border border-yellow-400/30 bg-yellow-400/5 mb-6 flex items-center gap-3">
          <AlertCircle size={18} className="text-yellow-400 flex-shrink-0" />
          <p className="text-yellow-400 text-sm">{error}</p>
        </div>
      )}

      {/* Applications List */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <FileText size={18} className="text-cyan-400" /> My Applications
          </h2>
          <button onClick={() => navigate('/track')}
            className="flex items-center gap-1.5 text-cyan-400 text-sm hover:underline">
            <Search size={14} /> Track by ID
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={40} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No applications yet.</p>
            <button onClick={() => navigate('/citizen/request')} className="btn-primary mt-4 text-sm px-6 py-2.5">
              Apply Now
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {applications.map(app => (
              <div key={app.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/3 hover:bg-white/5 transition border border-white/5">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{app.application_type}</p>
                  <p className="text-white/40 text-xs mt-0.5 font-mono">{app.tracking_id}</p>
                  <p className="text-white/25 text-xs">{new Date(app.submitted_at).toLocaleDateString('en-PK')}</p>
                </div>
                <span className={STATUS_STYLE[app.status] || 'status-pending'}>{app.status.replace(/_/g,' ')}</span>
                {app.status === 'COMPLETED' && (
                  <button onClick={() => handleDownload(app)}
                    className="flex items-center gap-1.5 text-xs text-cyan-400 hover:underline">
                    <Download size={14} /> Download
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
