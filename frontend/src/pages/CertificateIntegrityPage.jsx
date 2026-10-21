import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  CheckCircle2,
  FileUp,
  Shield,
  ShieldAlert,
  Search,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { policeAPI } from '../api/apiClient';
import { getApiErrorMessage, useNotification } from '../components/notificationContext';

const STATE_STYLES = {
  INTEGRITY_VERIFIED: {
    tone: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
    badge: 'bg-emerald-600/20 text-emerald-300 border border-emerald-400/30',
    icon: CheckCircle2,
    title: 'Certificate integrity verified',
  },
  HASH_MISMATCH: {
    tone: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
    badge: 'bg-amber-600/20 text-amber-200 border border-amber-400/30',
    icon: ShieldAlert,
    title: 'Hash mismatch detected',
  },
  INVALID_FILE: {
    tone: 'border-red-400/30 bg-red-500/10 text-red-300',
    badge: 'bg-red-600/20 text-red-200 border border-red-400/30',
    icon: FileUp,
    title: 'Invalid upload',
  },
  NO_TRUSTED_HASH: {
    tone: 'border-sky-400/30 bg-sky-500/10 text-sky-200',
    badge: 'bg-sky-600/20 text-sky-200 border border-sky-400/30',
    icon: Shield,
    title: 'Trusted issuance hash unavailable',
  },
  VERIFICATION_UNAVAILABLE: {
    tone: 'border-slate-400/30 bg-slate-500/10 text-slate-200',
    badge: 'bg-slate-600/20 text-slate-200 border border-slate-400/30',
    icon: Shield,
    title: 'Verification unavailable',
  },
  NO_CERTIFICATE_RECORD: {
    tone: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
    badge: 'bg-rose-600/20 text-rose-200 border border-rose-400/30',
    icon: Search,
    title: 'Certificate not found',
  },
  default: {
    tone: 'border-slate-400/30 bg-slate-500/10 text-slate-200',
    badge: 'bg-slate-600/20 text-slate-200 border border-slate-400/30',
    icon: Shield,
    title: 'Verification status',
  },
};

export default function CertificateIntegrityPage() {
  const { user } = useSelector((state) => state.auth);
  const notification = useNotification();
  const [certificateNumber, setCertificateNumber] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const portalRole = user?.role === 'POLICE_AUTHORITY' ? 'authority' : 'staff';

  const resultMeta = useMemo(() => {
    if (!result) return STATE_STYLES.default;
    return STATE_STYLES[result.state] || STATE_STYLES.default;
  }, [result]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!certificateNumber.trim()) {
      setError('Enter the certificate number or QR reference.');
      return;
    }
    if (!uploadedFile) {
      setError('Select a PDF certificate to compare.');
      return;
    }

    const formData = new FormData();
    formData.append('certificate_number', certificateNumber.trim());
    formData.append('file', uploadedFile);

    setLoading(true);

    try {
      const response = await policeAPI.verifyCertificateIntegrity(formData);
      setResult(response.data);
      if (response.data?.integrity_valid === true) {
        const certificateStatus = response.data.certificate_status
          ? ` Certificate status: ${response.data.certificate_status}.`
          : '';
        const auditStatus = response.data.audit_message ? ` ${response.data.audit_message}` : '';
        notification.success(
          'Integrity verified',
          `${response.data.message || 'The uploaded certificate matches the trusted record.'}${certificateStatus}${auditStatus}`,
        );
      } else if (response.data?.state === 'HASH_MISMATCH') {
        notification.error('Mismatch detected', response.data.message || 'The uploaded certificate does not match the trusted record.');
      } else {
        notification.error('Verification result', response.data.message || 'The certificate could not be validated.');
      }
    } catch (err) {
      const message = getApiErrorMessage(err, 'Certificate verification failed. Please try again.');
      setError(message);
      notification.error('Verification failed', message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = resultMeta.icon;

  return (
    <DashboardLayout role={portalRole} userName={user?.full_name || 'Officer'}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-semibold">Document integrity</p>
          <h1 className="font-display text-2xl font-bold text-white mt-1">Certificate Integrity Check</h1>
        </div>
        <div className="hidden md:flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/5 px-3 py-1.5 text-cyan-300 text-xs font-semibold">
          <Shield size={14} /> Trusted record verification
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <form onSubmit={handleSubmit} className="glass-card p-5 sm:p-6">
          <div className="mb-5">
            <label className="block text-xs uppercase tracking-[0.15em] text-slate-400 mb-2">Certificate number or QR reference</label>
            <input
              type="text"
              value={certificateNumber}
              onChange={(e) => setCertificateNumber(e.target.value)}
              placeholder="CERT-2026-001234 or QR hash"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs uppercase tracking-[0.15em] text-slate-400 mb-2">PDF upload</label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 px-4 py-8 text-center transition hover:border-cyan-500/60 hover:bg-slate-900/80">
              <FileUp className="h-8 w-8 text-cyan-400" />
              <div>
                <p className="text-sm font-semibold text-white">{uploadedFile ? uploadedFile.name : 'Choose PDF certificate'}</p>
                <p className="mt-1 text-xs text-slate-400">Accepted format: PDF only, max 10MB</p>
              </div>
              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setUploadedFile(e.target.files?.[0] || null)} />
            </label>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Verifying…' : 'Verify Certificate Integrity'}
          </button>
        </form>

        <div className="glass-card p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className={`rounded-full p-2 ${resultMeta.badge}`}>
              <StatusIcon size={18} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Verification result</p>
              <p className="text-lg font-semibold text-white">{result ? resultMeta.title : 'Awaiting check'}</p>
            </div>
          </div>

          {!result ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-5 text-sm text-slate-400">
              Upload a PDF and enter a certificate reference to compare the submitted document against the original issued hash.
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`rounded-2xl border p-4 ${resultMeta.tone}`}>
                <p className="text-sm font-medium">{result.message || 'Verification completed.'}</p>
              </div>

              <div className="grid gap-3 text-sm">
                <div className="flex justify-between gap-3 border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Certificate</span>
                  <span className="font-mono text-white">{result.certificate_number || certificateNumber || '—'}</span>
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-800 pb-2">
                  <span className="text-slate-400">PDF integrity</span>
                  <span className="text-white">{result.pdf_integrity || 'NOT_DETERMINED'}</span>
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Ledger integrity</span>
                  <span className={result.ledger_valid === true ? 'text-emerald-300' : result.ledger_valid === false ? 'text-red-300' : 'text-slate-400'}>
                    {result.ledger_status || 'NOT_CHECKED'}
                  </span>
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Certificate status</span>
                  <span className="text-white">{result.certificate_status || 'Unavailable'}</span>
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Hash match</span>
                  <span className={result.hash_match === 'MATCH' ? 'text-emerald-300' : result.hash_match === 'MISMATCH' ? 'text-amber-200' : 'text-slate-400'}>
                    {result.hash_match || 'NOT_DETERMINED'}
                  </span>
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-800 pb-2">
                  <span className="text-slate-400">{result.trusted_hash_validated ? 'Trusted original hash' : 'Issuance hash (unverified)'}</span>
                  <span className="font-mono text-xs text-white break-all">{result.original_hash || '—'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Uploaded hash</span>
                  <span className="font-mono text-xs text-white break-all">{result.uploaded_hash || '—'}</span>
                </div>
                <div className="flex justify-between gap-3 border-t border-slate-800 pt-2">
                  <span className="text-slate-400">Verified at</span>
                  <span className="text-right text-white">{result.verified_at ? new Date(result.verified_at).toLocaleString() : '—'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Verification audit event</span>
                  <span className={result.audit_recorded ? 'text-emerald-300' : 'text-amber-200'}>
                    {result.audit_recorded ? 'Recorded' : 'Not recorded'}
                  </span>
                </div>
                <div className="flex justify-between gap-3 border-t border-slate-800 pt-2">
                  <span className="text-slate-400">Issuance event</span>
                  <span className="text-right text-white">
                    {result.issuance_event
                      ? `Block #${result.issuance_event.block_index} · ${result.issuance_event.action_type}`
                      : 'Unavailable'}
                  </span>
                </div>
                {result.issuance_event && (
                  <div className="space-y-1 text-xs text-slate-400">
                    <p>Recorded at: {new Date(result.issuance_event.timestamp).toLocaleString()}</p>
                    <p className="font-mono break-all">Event hash: {result.issuance_event.current_hash}</p>
                  </div>
                )}
                {result.diagnostic && (
                  <p className="text-xs text-amber-200">{result.diagnostic}</p>
                )}
                {result.ledger_issues?.length > 0 && (
                  <div className="rounded-xl border border-red-400/20 bg-red-500/5 p-3 text-xs text-red-200">
                    <p className="mb-1 font-semibold">
                      Ledger diagnostics ({result.ledger_issues.length})
                    </p>
                    {result.ledger_issues.slice(0, 3).map((issue) => (
                      <p key={issue}>{issue}</p>
                    ))}
                    {result.ledger_issues.length > 3 && (
                      <p>Additional ledger issues are available in the verification response.</p>
                    )}
                  </div>
                )}
                {result.audit_message && (
                  <p className="text-xs text-amber-200">{result.audit_message}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
