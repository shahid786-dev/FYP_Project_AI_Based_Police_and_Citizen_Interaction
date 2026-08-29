import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  CreditCard, CheckCircle, AlertCircle, Shield, Copy, Smartphone,
  Building2, Banknote, ChevronRight, Clock, Award, Lock
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { applicationAPI } from '../api/apiClient';

const PAYMENT_METHODS = [
  {
    id: 'CHALLAN',
    label: 'Bank Challan',
    icon: Building2,
    color: 'from-blue-600 to-blue-800',
    border: 'border-blue-500/40',
    description: 'Pay at any HBL, NBP, or UBL branch',
    badge: 'Government Option',
    badgeColor: 'text-blue-400 bg-blue-950',
  },
  {
    id: 'EASYPAISA',
    label: 'EasyPaisa',
    icon: Smartphone,
    color: 'from-emerald-600 to-emerald-800',
    border: 'border-emerald-500/40',
    description: 'Pay via EasyPaisa mobile account',
    badge: 'Instant Payment',
    badgeColor: 'text-emerald-400 bg-emerald-950',
  },
  {
    id: 'JAZZCASH',
    label: 'JazzCash',
    icon: Smartphone,
    color: 'from-red-600 to-red-800',
    border: 'border-red-500/40',
    description: 'Pay via JazzCash mobile account',
    badge: 'Mobile Wallet',
    badgeColor: 'text-red-400 bg-red-950',
  },
  {
    id: 'BANK_TRANSFER',
    label: 'Internet Banking',
    icon: Banknote,
    color: 'from-purple-600 to-purple-800',
    border: 'border-purple-500/40',
    description: 'Pay via online bank transfer',
    badge: 'All Banks',
    badgeColor: 'text-purple-400 bg-purple-950',
  },
];

const CHALLAN_INFO = {
  account: '0123-4567-8901',
  iban: 'PK36HABB0000123456789012',
  beneficiary: 'Pakistan Police Service Fund',
  branch: 'SBP Main Branch, Islamabad',
};

export default function PaymentPage() {
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [step, setStep] = useState('select'); // select | confirm | success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  // Payment details
  const [txnId, setTxnId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [pin, setPin] = useState('');

  useEffect(() => {
    applicationAPI.list()
      .then(res => {
        const payableApps = (res.data || []).filter(a =>
          a.status === 'PAYMENT_PENDING'
        );
        setApplications(payableApps);
        if (payableApps.length === 1) setSelectedApp(payableApps[0]);
      })
      .catch(() => {});
  }, []);

  const copyText = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(''), 2000);
  };

  const handlePay = async () => {
    if (!selectedApp) { setError('Please select an application.'); return; }
    if (!paymentMethod) { setError('Please select a payment method.'); return; }
    if (['EASYPAISA', 'JAZZCASH'].includes(paymentMethod) && !mobileNumber) {
      setError('Please enter your mobile number.'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await applicationAPI.pay(selectedApp.id, { payment_method: paymentMethod, mobile_number: mobileNumber });
      setTxnId(res.data.transaction_id);
      setStep('success');
    } catch (err) {
      setError(err.response?.data?.error || 'Payment failed. Please try again.');
    } finally { setLoading(false); }
  };

  const selectedMethod = PAYMENT_METHODS.find(m => m.id === paymentMethod);

  return (
    <DashboardLayout role="citizen" userName={user?.full_name || 'Citizen'}>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
            <CreditCard size={16} className="text-emerald-400" />
          </div>
          <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Payment Portal</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-white">Pay Verification Fees</h1>
        <p className="text-slate-400 text-xs mt-0.5">Secure payment gateway for police verification clearance</p>
      </div>

      {/* Success State */}
      {step === 'success' && (
        <div className="max-w-lg mx-auto">
          <div className="bg-slate-900 border border-green-500/30 rounded-3xl p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-green-400" />
            </div>
            <h2 className="font-display text-2xl font-bold text-white mb-2">Payment Confirmed!</h2>
            <p className="text-slate-400 text-sm mb-6">Your payment has been successfully processed and recorded on the blockchain.</p>

            <div className="bg-slate-950 rounded-2xl p-4 mb-6 space-y-2 text-xs text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID</span>
                <span className="font-mono text-cyan-400">{txnId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Application</span>
                <span className="font-mono text-white">{selectedApp?.tracking_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid</span>
                <span className="text-green-400 font-bold">PKR 650</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method</span>
                <span className="text-white">{paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="text-green-400 font-bold">CONFIRMED</span>
              </div>
            </div>

            <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-3 mb-6 text-xs text-amber-300">
              Your certificate will be issued by the police authority. You'll receive a notification when it's ready to download.
            </div>

            <div className="flex gap-3">
              <button onClick={() => navigate('/citizen/dashboard')}
                className="flex-1 btn-secondary py-3">Back to Dashboard</button>
              <button onClick={() => navigate('/citizen/certificate')}
                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
                <Award size={16} /> Check Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {step !== 'success' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left - Application & Payment Selection */}
          <div className="lg:col-span-2 space-y-6">

            {/* Select Application */}
            {applications.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
                <Shield size={40} className="text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">No applications pending payment</p>
                <p className="text-slate-600 text-xs mt-1">Your application needs to be approved by the admin before payment.</p>
                <button onClick={() => navigate('/citizen/dashboard')} className="btn-secondary mt-4 text-sm">
                  Back to Dashboard
                </button>
              </div>
            ) : (
              <>
                {/* Applications */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                  <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                    <Shield size={16} className="text-amber-400" /> Select Application to Pay
                  </h2>
                  <div className="space-y-2">
                    {applications.map(app => (
                      <button key={app.id} onClick={() => setSelectedApp(app)}
                        className={`w-full p-4 rounded-2xl border text-left transition ${
                          selectedApp?.id === app.id
                            ? 'bg-cyan-950/40 border-cyan-500/40'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-bold text-sm">{app.application_type}</p>
                            <p className="text-amber-400 font-mono text-xs mt-0.5">{app.tracking_id}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-emerald-400 font-bold text-base">PKR 650</p>
                            <p className="text-slate-500 text-xs">Due Now</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                  <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                    <CreditCard size={16} className="text-cyan-400" /> Choose Payment Method
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {PAYMENT_METHODS.map(method => (
                      <button key={method.id} onClick={() => setPaymentMethod(method.id)}
                        className={`p-4 rounded-2xl border text-left transition ${
                          paymentMethod === method.id
                            ? `${method.border} bg-slate-800`
                            : 'border-slate-800 hover:border-slate-700'
                        }`}>
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center mb-3`}>
                          <method.icon size={20} className="text-white" />
                        </div>
                        <p className="text-white font-bold text-sm">{method.label}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{method.description}</p>
                        <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded ${method.badgeColor}`}>
                          {method.badge}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Details based on method */}
                {paymentMethod === 'CHALLAN' && (
                  <div className="bg-slate-900 border border-blue-500/20 rounded-3xl p-6">
                    <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                      <Building2 size={16} className="text-blue-400" /> Bank Challan Details
                    </h2>
                    <div className="space-y-3 text-sm">
                      {[
                        ['Account No.', CHALLAN_INFO.account],
                        ['IBAN', CHALLAN_INFO.iban],
                        ['Beneficiary', CHALLAN_INFO.beneficiary],
                        ['Branch', CHALLAN_INFO.branch],
                        ['Amount', 'PKR 650'],
                      ].map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl">
                          <span className="text-slate-500 text-xs">{k}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-mono text-xs">{v}</span>
                            <button onClick={() => copyText(v, k)}
                              className="text-slate-500 hover:text-cyan-400 transition">
                              <Copy size={12} />
                            </button>
                            {copied === k && <span className="text-green-400 text-[10px]">Copied!</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-slate-500 text-xs mt-4">After payment, click "Confirm Payment" below. Your account will be updated automatically.</p>
                  </div>
                )}

                {['EASYPAISA', 'JAZZCASH'].includes(paymentMethod) && (
                  <div className={`bg-slate-900 border ${paymentMethod === 'EASYPAISA' ? 'border-emerald-500/20' : 'border-red-500/20'} rounded-3xl p-6`}>
                    <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                      <Smartphone size={16} className={paymentMethod === 'EASYPAISA' ? 'text-emerald-400' : 'text-red-400'} />
                      {paymentMethod === 'EASYPAISA' ? 'EasyPaisa' : 'JazzCash'} Payment
                    </h2>
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-950 rounded-2xl">
                        <p className="text-slate-400 text-xs mb-1">Merchant Account</p>
                        <p className="text-white font-mono font-bold">0300-9876543</p>
                        <p className="text-slate-500 text-xs mt-1">Pakistan Police Service Fund</p>
                      </div>
                      <div>
                        <label className="label-text">Your Mobile Number *</label>
                        <input className="input-field font-mono" placeholder="03001234567"
                          value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} />
                      </div>
                      <div>
                        <label className="label-text">Transaction PIN (Simulated)</label>
                        <input type="password" className="input-field font-mono" placeholder="Enter 5-digit PIN"
                          maxLength={5} value={pin} onChange={e => setPin(e.target.value)} />
                        <p className="text-slate-500 text-xs mt-1">For demo, enter any 5 digits</p>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'BANK_TRANSFER' && (
                  <div className="bg-slate-900 border border-purple-500/20 rounded-3xl p-6">
                    <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                      <Banknote size={16} className="text-purple-400" /> Internet Banking Transfer
                    </h2>
                    <div className="space-y-3">
                      {[
                        ['Account Title', 'Pakistan Police Service'],
                        ['IBAN', CHALLAN_INFO.iban],
                        ['Bank', 'State Bank of Pakistan'],
                        ['Reference', selectedApp?.tracking_id || 'Your Tracking ID'],
                        ['Amount', 'PKR 650'],
                      ].map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl">
                          <span className="text-slate-500 text-xs">{k}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-mono text-xs">{v}</span>
                            <button onClick={() => copyText(v, k)} className="text-slate-500 hover:text-cyan-400 transition">
                              <Copy size={12} />
                            </button>
                            {copied === k && <span className="text-green-400 text-[10px]">Copied!</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    <AlertCircle size={16} />{error}
                  </div>
                )}

                {/* Pay Button */}
                {paymentMethod && selectedApp && (
                  <button onClick={handlePay} disabled={loading}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold text-base flex items-center justify-center gap-3 shadow-lg shadow-emerald-950/50 transition">
                    {loading
                      ? <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                      : <>
                          <Lock size={18} /> Confirm Payment — PKR 650
                        </>}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Right — Summary Card */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-white font-bold text-sm mb-4">Payment Summary</h3>
              <div className="space-y-2 text-sm mb-4">
                {[
                  ['Application Fee', 'PKR 500'],
                  ['AI Verification', 'PKR 100'],
                  ['Processing', 'PKR 50'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-slate-400">
                    <span>{k}</span><span>{v}</span>
                  </div>
                ))}
                <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-white text-base">
                  <span>Total</span><span className="text-emerald-400">PKR 650</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                <Lock size={12} className="inline mr-1" />
                Secured & encrypted payment. Blockchain verified.
              </div>
            </div>

            {selectedApp && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h3 className="text-white font-bold text-sm mb-3">Application Details</h3>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Type</span>
                    <span className="text-white">{selectedApp.application_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tracking ID</span>
                    <span className="font-mono text-amber-400">{selectedApp.tracking_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Applicant</span>
                    <span className="text-white">{selectedApp.applicant?.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Province</span>
                    <span className="text-white">{selectedApp.applicant_province || selectedApp.applicant?.province || '—'}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <Clock size={14} className="text-cyan-400" /> After Payment
              </h3>
              <div className="space-y-2 text-xs text-slate-400">
                <p className="flex items-start gap-2"><CheckCircle size={12} className="text-green-400 mt-0.5 flex-shrink-0" /> Payment confirmation recorded on blockchain</p>
                <p className="flex items-start gap-2"><CheckCircle size={12} className="text-green-400 mt-0.5 flex-shrink-0" /> Certificate generation begins automatically</p>
                <p className="flex items-start gap-2"><CheckCircle size={12} className="text-green-400 mt-0.5 flex-shrink-0" /> SMS & notification sent to your phone</p>
                <p className="flex items-start gap-2"><CheckCircle size={12} className="text-green-400 mt-0.5 flex-shrink-0" /> Download certificate from dashboard</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
