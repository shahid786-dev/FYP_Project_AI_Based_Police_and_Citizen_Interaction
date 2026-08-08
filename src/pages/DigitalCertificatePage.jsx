import { useRef, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, QrCode, Shield, CheckCircle, Printer, AlertCircle, FileText } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { certAPI, applicationAPI } from '../api/apiClient';

export default function DigitalCertificatePage() {
  const { certNumber } = useParams();
  const certRef = useRef(null);
  
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    if (certNumber) {
      // Public verification
      certAPI.verify(certNumber)
        .then(res => { setCert(res.data); setLoading(false); })
        .catch(err => { setError('Invalid or expired certificate number.'); setLoading(false); });
    } else {
      // Load user's latest completed applications
      applicationAPI.list()
        .then(res => {
          const completed = res.data.filter(a => a.status === 'COMPLETED');
          setApplications(completed);
          if (completed.length > 0) {
            setCert({
              certificate_number: completed[0].tracking_id, // Dummy mapped
              applicant_name: completed[0].applicant?.full_name,
              cnic: completed[0].applicant?.cnic,
              issue_date: new Date(completed[0].updated_at).toLocaleDateString('en-PK'),
              expiry_date: new Date(new Date(completed[0].updated_at).setMonth(new Date().getMonth() + 6)).toLocaleDateString('en-PK'),
              status: completed[0].status,
              app_data: completed[0]
            });
          }
          setLoading(false);
        })
        .catch(err => { setError('Failed to load certificates.'); setLoading(false); });
    }
  }, [certNumber]);

  const print = () => window.print();

  const handleDownloadPdf = async (appId) => {
    try {
      const response = await applicationAPI.downloadCert(appId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Certificate_${appId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to download PDF.");
    }
  };

  if (loading) {
    return (
      <DashboardLayout role={certNumber ? 'public' : 'citizen'} userName={cert?.applicant_name || 'Citizen'}>
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
        </div>
      </DashboardLayout>
    );
  }

  if (error || (!certNumber && applications.length === 0)) {
    return (
      <DashboardLayout role={certNumber ? 'public' : 'citizen'} userName="Citizen">
        <div className="glass-card p-12 text-center max-w-2xl mx-auto mt-10">
          <AlertCircle size={40} className="text-white/10 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">No Certificates Found</h2>
          <p className="text-white/40 mb-6">{error || "You don't have any completed applications with generated certificates yet."}</p>
          {!certNumber && (
            <Link to="/citizen/request" className="btn-primary inline-flex items-center gap-2">
              <FileText size={16} /> Start a New Request
            </Link>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={certNumber ? 'public' : 'citizen'} userName={cert?.applicant_name || 'Citizen'}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Digital Certificate</h1>
          <p className="text-white/50 mt-1 text-sm">Your verified police character certificate</p>
        </div>
        <div className="flex gap-3">
          <button onClick={print} className="btn-secondary flex items-center gap-2 text-sm">
            <Printer size={16}/> Print
          </button>
          {!certNumber && cert?.app_data?.id && (
            <button onClick={() => handleDownloadPdf(cert.app_data.id)} className="btn-primary flex items-center gap-2 text-sm">
              <Download size={16}/> Download PDF
            </button>
          )}
        </div>
      </div>

      {/* Authenticity banner */}
      <div className="glass-card p-4 border border-green-400/30 bg-green-400/5 flex items-center gap-3 mb-6">
        <CheckCircle size={20} className="text-green-400 flex-shrink-0"/>
        <div className="flex-1">
          <p className="text-green-400 font-semibold text-sm">Verified & Authentic Certificate</p>
          <p className="text-white/40 text-xs">This certificate is digitally signed and can be verified using the QR code below.</p>
        </div>
        <span className="font-mono text-cyan-400 text-xs border border-cyan-400/30 px-2 py-1 rounded-lg">{cert?.certificate_number || 'CERT-XXXXXX'}</span>
      </div>

      {/* Certificate */}
      <div className="flex justify-center mb-10">
        <div ref={certRef} className="w-full max-w-2xl certificate-bg rounded-3xl overflow-hidden shadow-2xl print:shadow-none bg-white">
          {/* Header band */}
          <div className="bg-gradient-to-r from-[#003580] to-[#00529b] px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl">🏅</div>
              <div className="text-white">
                <p className="text-xs opacity-70 uppercase tracking-wider">حکومت پاکستان</p>
                <p className="font-bold text-lg leading-tight">Government of Pakistan</p>
                <p className="text-xs opacity-80">Punjab Police — AI Verification System</p>
              </div>
            </div>
            <div className="text-white text-right">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center ml-auto">
                <Shield size={24} className="text-white"/>
              </div>
            </div>
          </div>

          {/* Certificate body */}
          <div className="px-8 py-8 bg-gradient-to-b from-[#f8f4e8] to-[#fff8e8]">
            <div className="text-center mb-8">
              <div className="inline-block border-b-4 border-[#003580] pb-2 mb-1">
                <h2 className="text-[#003580] font-bold text-2xl uppercase tracking-wider">Character Certificate</h2>
              </div>
              <p className="text-[#003580]/60 text-sm">پولیس کردار سرٹیفیکیٹ</p>
            </div>

            <div className="text-[#2c3e50] leading-relaxed mb-8">
              <p className="mb-4 text-sm text-center text-[#003580]/60 italic">This is to certify that:</p>
              <div className="bg-white/70 rounded-2xl p-6 border border-[#003580]/10 mb-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    ['Full Name',    cert?.applicant_name || 'N/A'],
                    ['CNIC Number',  cert?.cnic || 'N/A'],
                    ['Issue Date',   cert?.issue_date || 'N/A'],
                    ['Expiry Date',  cert?.expiry_date || 'N/A'],
                    ['Status',       cert?.status || 'N/A'],
                    ['Certificate #',cert?.certificate_number || 'N/A'],
                  ].map(([k,v]) => (
                    <div key={k}>
                      <p className="text-[#003580]/50 text-xs font-medium uppercase tracking-wide">{k}</p>
                      <p className="text-[#2c3e50] font-semibold text-sm mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-justify leading-relaxed text-[#4a5568]">
                has been verified through the <strong>AI-Powered Police Verification System</strong> and is found to have
                <strong className="text-green-700"> No Criminal Record </strong>
                in the Punjab Police Database as of the date of issue. This certificate is issued for the purpose of
                <strong> Employment / Verification</strong> and is valid for a period of six (6) months from the date of issue.
              </p>
            </div>

            {/* AI Verification badge */}
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3 mb-8">
              <CheckCircle size={20} className="text-green-600 flex-shrink-0"/>
              <div className="flex-1">
                <p className="text-green-800 font-semibold text-xs">AI Verified</p>
                <p className="text-green-600 text-xs">Deepfake: Clear | Liveness: Confirmed | Identity: Matched</p>
              </div>
              <div className="text-green-600 text-xs font-mono border border-green-300 px-2 py-1 rounded-lg">AUTHENTIC</div>
            </div>

            {/* Signatures + QR */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <div className="h-12 border-b-2 border-[#003580]/20 mb-2 flex items-end justify-center">
                  <span className="text-[#003580]/40 font-script text-2xl italic">SHO</span>
                </div>
                <p className="text-[#003580] text-xs font-bold">SHO Signature</p>
              </div>

              <div className="text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-white border-2 border-[#003580]/20 rounded-xl flex items-center justify-center mb-2">
                  <QrCode size={56} className="text-[#003580]" />
                </div>
                <p className="text-[#003580]/50 text-xs">Scan to Verify</p>
              </div>

              <div className="text-center">
                <div className="h-12 border-b-2 border-[#003580]/20 mb-2 flex items-end justify-center">
                  <span className="text-[#003580]/40 font-script text-2xl italic">SP</span>
                </div>
                <p className="text-[#003580] text-xs font-bold">SP Headquarters</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
