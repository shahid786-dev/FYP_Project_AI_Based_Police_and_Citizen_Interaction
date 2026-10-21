import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { FileCheck2, Fingerprint, QrCode, Shield } from 'lucide-react';

const WORKFLOW = [
  {
    icon: FileCheck2,
    title: 'Apply and track',
    description: 'Submit a police verification application and follow its status through the citizen portal.',
  },
  {
    icon: Fingerprint,
    title: 'Identity and document review',
    description: 'Complete the identity checks and document review required for your application.',
  },
  {
    icon: Shield,
    title: 'Police review',
    description: 'Police staff and authority review applications and record decisions in the workflow.',
  },
  {
    icon: QrCode,
    title: 'Digital certificate',
    description: 'Access issued certificates and verify them using certificate details or a QR code.',
  },
];

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1">
        <section className="pt-32 pb-16 px-4 max-w-6xl mx-auto w-full">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="px-3 py-1 rounded-full bg-cyan-950 text-cyan-400 font-semibold text-xs uppercase tracking-wider border border-cyan-800/40">
                About PakVerify
              </span>
              <h1 className="text-4xl md:text-5xl font-black font-display text-white mt-4 tracking-tight leading-tight">
                Police verification, <span className="text-cyan-400">online and trackable</span>
              </h1>
              <p className="text-slate-400 mt-6 text-lg leading-relaxed">
                PakVerify supports the police verification process from application submission and identity review to police decisions and digital certificate verification.
              </p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full" />
              <img
                src="/police_team.png"
                alt="Police team"
                className="relative z-10 w-full h-auto rounded-3xl shadow-2xl border-4 border-slate-800 object-cover"
              />
            </div>
          </div>
        </section>

        <section className="py-16 bg-slate-900 border-y border-slate-800">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white">How verification works</h2>
              <p className="text-slate-400 mt-3">A clear workflow for citizens and police teams.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {WORKFLOW.map(({ icon: Icon, title, description }) => (
                <article key={title} className="p-6 bg-slate-950 border border-slate-800 rounded-3xl">
                  <Icon size={36} className="text-cyan-400 mb-4" />
                  <h3 className="text-white text-lg font-bold">{title}</h3>
                  <p className="text-slate-400 text-sm mt-2 leading-relaxed">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 max-w-4xl mx-auto text-center">
          <p className="text-slate-400 text-lg leading-relaxed">
            Application status, certificate records, and verification results are presented through the relevant PakVerify portals. The site also includes an AI chatbot to help users navigate the application.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
