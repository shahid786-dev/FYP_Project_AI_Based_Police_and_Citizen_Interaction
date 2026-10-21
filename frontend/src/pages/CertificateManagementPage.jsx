import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AlertCircle, Award, ChevronLeft, ChevronRight, ExternalLink, RefreshCw, Search, X } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { certificateManagementAPI } from '../api/apiClient';
import { getApiErrorMessage, useNotification } from '../components/notificationContext';

const PAGE_SIZE = 10;

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export default function CertificateManagementPage() {
  const { user } = useSelector((state) => state.auth);
  const notification = useNotification();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [certificates, setCertificates] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNumber, setSelectedNumber] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadCertificates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await certificateManagementAPI.list({
        search,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setCertificates(response.data.results || []);
      setCount(response.data.count || 0);
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Certificates could not be loaded. Try again.');
      setCertificates([]);
      setCount(0);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(loadCertificates, 0);
    return () => clearTimeout(timer);
  }, [loadCertificates]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  };

  const openDetails = async (certificateNumber) => {
    if (selectedNumber === certificateNumber) {
      setSelectedNumber('');
      setSelectedCertificate(null);
      return;
    }

    setSelectedNumber(certificateNumber);
    setSelectedCertificate(null);
    setDetailLoading(true);
    try {
      const response = await certificateManagementAPI.detail(certificateNumber);
      setSelectedCertificate(response.data);
    } catch (requestError) {
      notification.error('Unable to Load Certificate', getApiErrorMessage(requestError, 'Certificate details could not be loaded.'));
      setSelectedNumber('');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedNumber('');
    setSelectedCertificate(null);
  };

  const role = user?.role === 'SUPER_ADMIN'
    ? 'admin'
    : user?.role === 'POLICE_AUTHORITY'
      ? 'authority'
      : 'staff';
  const firstResult = count === 0 ? 0 : page * PAGE_SIZE + 1;
  const lastResult = Math.min((page + 1) * PAGE_SIZE, count);

  return (
    <DashboardLayout role={role} userName={user?.full_name || 'Officer'}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-400 font-semibold">Central records</p>
          <h1 className="font-display text-2xl font-bold text-white mt-1">Certificate Management</h1>
          <p className="text-sm text-slate-400 mt-1">Search issued certificates and inspect their workflow and authenticity references.</p>
        </div>
        <button
          type="button"
          onClick={loadCertificates}
          disabled={loading}
          className="btn-secondary inline-flex items-center gap-2 text-sm disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <form onSubmit={submitSearch} className="glass-card p-4 mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Certificate number, applicant, or application reference"
            className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <button type="submit" className="btn-primary inline-flex items-center justify-center gap-2 text-sm">
          <Search size={15} /> Search
        </button>
      </form>

      {error && (
        <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="glass-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 text-xs text-slate-400 sm:px-5">
          <span>{loading ? 'Loading certificates…' : `${count} certificate${count === 1 ? '' : 's'} found`}</span>
          {!loading && count > 0 && <span>{firstResult}–{lastResult} of {count}</span>}
        </div>

        {loading ? (
          <div className="py-14 text-center text-sm text-slate-400">Loading centralized certificate records…</div>
        ) : error ? null : certificates.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Award size={30} className="mx-auto mb-3 text-slate-600" />
            <p className="font-semibold text-white">{search ? 'No matching certificates' : 'No certificates issued yet'}</p>
            <p className="mt-1 text-sm text-slate-400">
              {search ? 'Try another certificate number or applicant reference.' : 'Successfully issued certificates will appear here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {certificates.map((certificate) => (
              <div key={certificate.id}>
                <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold text-cyan-300">{certificate.certificate_number}</p>
                    <p className="mt-1 truncate text-sm text-white">{certificate.applicant.full_name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {certificate.application.certificate_type} · Ref {certificate.application.tracking_id}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-slate-300">{formatDate(certificate.issue_date)}</p>
                      <p className={`mt-1 text-[10px] font-bold uppercase ${
                        certificate.status === 'VALID' ? 'text-emerald-300' : certificate.status === 'REVOKED' ? 'text-red-300' : 'text-amber-200'
                      }`}>{certificate.status}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openDetails(certificate.certificate_number)}
                      className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/50 hover:text-white"
                    >
                      {selectedNumber === certificate.certificate_number ? 'Close details' : 'View details'}
                    </button>
                  </div>
                </div>

                {selectedNumber === certificate.certificate_number && (
                  <div className="border-t border-slate-800 bg-slate-950/50 px-4 py-4 sm:px-5">
                    {detailLoading ? (
                      <p className="text-sm text-slate-400">Loading certificate details…</p>
                    ) : selectedCertificate ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 text-sm">
                          <p className="font-semibold text-white">Certificate and applicant</p>
                          <p className="text-slate-300">Applicant: {selectedCertificate.applicant.full_name}</p>
                          <p className="text-slate-300">CNIC: {selectedCertificate.applicant.cnic || 'Not available'}</p>
                          <p className="text-slate-300">Expiry: {formatDate(selectedCertificate.validity_expiry)}</p>
                          <p className="text-slate-300">Province: {selectedCertificate.application.province || '—'}</p>
                          <p className="text-slate-300">Issuing authority: {selectedCertificate.application.issuing_authority}</p>
                          <p className="text-slate-300">Application status: {selectedCertificate.application.status}</p>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p className="font-semibold text-white">Approval and verification</p>
                          <p className="text-slate-300">Staff reviewer: {selectedCertificate.approval.staff_reviewer || '—'}</p>
                          <p className="text-slate-300">Authority approver: {selectedCertificate.approval.authority_decider || '—'}</p>
                          <p className="text-slate-300">Payment verified by: {selectedCertificate.approval.payment_verified_by || '—'}</p>
                          <p className="text-slate-300">Payment verified: {selectedCertificate.approval.payment_verified ? 'Yes' : 'No'}</p>
                          <p className="break-all font-mono text-xs text-slate-400">Blockchain reference: {selectedCertificate.blockchain_transaction_hash || 'Not recorded'}</p>
                          <a
                            href={selectedCertificate.verification_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 pt-1 text-cyan-300 hover:text-cyan-200"
                          >
                            Open public verification <ExternalLink size={13} />
                          </a>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">Sensitive identifiers are masked in certificate details.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { closeDetails(); setPage((current) => Math.max(0, current - 1)); }}
            disabled={page === 0 || loading}
            className="rounded-lg border border-slate-700 p-2 text-slate-300 disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            onClick={() => { closeDetails(); setPage((current) => current + 1); }}
            disabled={(page + 1) * PAGE_SIZE >= count || loading}
            className="rounded-lg border border-slate-700 p-2 text-slate-300 disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight size={17} />
          </button>
          {selectedNumber && (
            <button type="button" onClick={closeDetails} className="rounded-lg border border-slate-700 p-2 text-slate-300" aria-label="Close details">
              <X size={17} />
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
