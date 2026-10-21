import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { applicationAPI } from '../api/apiClient';

const DOCUMENT_LABELS = {
  CNIC_FRONT: 'CNIC Front',
  CNIC_BACK: 'CNIC Back',
  PASSPORT_PHOTO: 'Passport Photo',
  LIVE_PHOTO: 'Live Photo',
  SUPPORTING: 'Supporting Document',
};

export default function DocumentReview({
  documents = [],
  onlyTypes,
  requiredTypes = [],
  title = 'Uploaded Documents',
}) {
  const selectedDocuments = onlyTypes
    ? documents.filter(document => onlyTypes.includes(document.document_type))
    : documents;
  const documentIds = selectedDocuments.map(document => document.id).join(',');
  const [files, setFiles] = useState({});

  useEffect(() => {
    let active = true;
    const objectUrls = [];

    documentIds.split(',').filter(Boolean).forEach(async (documentId) => {
      try {
        const response = await applicationAPI.documentFile(documentId);
        const url = URL.createObjectURL(response.data);
        if (active) {
          objectUrls.push(url);
          setFiles(previous => ({
            ...previous,
            [documentId]: { url, contentType: response.data.type },
          }));
        } else {
          URL.revokeObjectURL(url);
        }
      } catch {
        if (active) setFiles(previous => ({ ...previous, [documentId]: { error: true } }));
      }
    });

    return () => {
      active = false;
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [documentIds]);

  const missingRequiredTypes = requiredTypes
    .filter(type => !documents.some(document => document.document_type === type));
  const missingLabels = missingRequiredTypes.map(type => DOCUMENT_LABELS[type] || type);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-300">{title}</h3>
      {selectedDocuments.length === 0 ? (
        <p className="text-xs text-slate-500">
          {missingLabels.length
            ? `${missingLabels.join(', ')} not uploaded.`
            : 'No document uploaded.'}
        </p>
      ) : (
        <>
          {missingLabels.length > 0 && (
            <p className="mb-3 text-xs text-amber-400">
              Missing required documents: {missingLabels.join(', ')}.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {selectedDocuments.map(document => {
            const loadedFile = files[document.id];
            const label = DOCUMENT_LABELS[document.document_type] || document.document_type;

            return (
              <div key={document.id} className="min-w-0 rounded-lg border border-slate-800 p-2">
                <p className="mb-2 truncate text-[11px] font-semibold text-slate-300">{label}</p>
                {loadedFile?.url && loadedFile.contentType?.startsWith('image/') ? (
                  <a href={loadedFile.url} target="_blank" rel="noreferrer" aria-label={`View ${label}`}>
                    <img
                      src={loadedFile.url}
                      alt={label}
                      className="h-36 w-full rounded-md bg-slate-900 object-contain"
                    />
                  </a>
                ) : loadedFile?.url ? (
                  <a
                    href={loadedFile.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-36 items-center justify-center gap-2 rounded-md bg-slate-900 text-cyan-300 hover:text-cyan-200"
                  >
                    <FileText size={20} />
                    <span className="text-xs">Open document</span>
                  </a>
                ) : loadedFile?.error ? (
                  <p className="flex h-36 items-center justify-center text-xs text-amber-400">
                    Document could not be loaded.
                  </p>
                ) : (
                  <p className="flex h-36 items-center justify-center text-xs text-slate-500">
                    Loading document…
                  </p>
                )}
                {loadedFile?.url && (
                  <a
                    href={loadedFile.url}
                    download
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                  >
                    <Download size={12} /> Download
                  </a>
                )}
              </div>
            );
          })}
          </div>
        </>
      )}
    </section>
  );
}
