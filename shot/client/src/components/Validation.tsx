import type { LabelAnalysisResult } from '@/types/domain';
import Status from './Status';

interface Props {
  result: LabelAnalysisResult;
  imageUrl?: string | null;
}

const MATCH_LABELS = {
  exact: 'Exact match',
  probable: 'Probable match',
  mismatch: 'Mismatch',
  missing: 'Not detected',
  not_checked: 'Not compared',
} as const;

const CARD_STYLES = {
  compliant: 'border-gov-green bg-green-50/60',
  warning: 'border-gov-yellow bg-yellow-50/80',
  non_compliant: 'border-gov-red bg-red-50/80',
  not_checked: 'border-gov-gray-lighter bg-gov-gray-lightest',
} as const;

function ValuePanel({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded border border-gov-gray-lighter bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gov-gray">{label}</p>
      <p className="mt-2 text-sm text-gov-navy break-words font-mono">
        {value ?? <span className="font-sans italic text-gov-gray">Not available</span>}
      </p>
    </div>
  );
}

function CheckItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {passed ? (
        <svg className="h-5 w-5 text-gov-green flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="h-5 w-5 text-gov-red flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      )}
      <span className={passed ? 'text-gov-gray' : 'text-gov-red font-medium'}>{label}</span>
    </li>
  );
}

export default function Validation({ result, imageUrl }: Props) {
  const { fields, warning, status, ocr, steps } = result;
  const allRows = [...fields, warning];
  const probableMatches = allRows.filter((field) => field.match === 'probable').length;
  const hardFailures = allRows.filter((field) => field.status === 'non_compliant').length;
  const quickStats = [
    { label: 'Fields reviewed', value: allRows.length, tone: 'bg-gov-gray-lightest' },
    { label: 'Probable matches', value: probableMatches, tone: 'bg-yellow-50' },
    { label: 'Hard failures', value: hardFailures, tone: 'bg-red-50' },
  ];

  const overallBorderColor =
    status === 'compliant'
      ? 'border-gov-green'
      : status === 'warning'
      ? 'border-gov-yellow'
      : 'border-gov-red';

  const overallBgColor =
    status === 'compliant'
      ? 'bg-green-50'
      : status === 'warning'
      ? 'bg-yellow-50'
      : 'bg-red-50';

  const overallHeading =
    status === 'compliant'
      ? 'Label Appears Compliant'
      : status === 'warning'
      ? 'Review Required'
      : 'Non-Compliant — Action Required';

  const overallSubtext =
    status === 'compliant'
      ? 'All checked fields match requirements.'
      : 'One or more fields require attention before this label can be approved.';

  return (
    <section aria-label="Validation Results" className="space-y-4">
      {/* Overall status banner */}
      <div className={`rounded border-l-4 p-4 ${overallBgColor} ${overallBorderColor}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Status status={status} large />
            <div>
              <p className="text-lg font-bold text-gov-navy">{overallHeading}</p>
              <p className="text-sm text-gov-gray mt-0.5">{overallSubtext}</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[24rem]">
            {quickStats.map((stat) => (
              <div key={stat.label} className={`rounded border border-gov-gray-lighter px-3 py-2.5 ${stat.tone}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gov-gray">{stat.label}</p>
                <p className="mt-1 text-lg font-semibold text-gov-navy">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Image and field review */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[0.9fr,1.1fr]">
        {/* Source image */}
        <div className="bg-white rounded shadow-sm border border-gov-gray-lighter overflow-hidden xl:sticky xl:top-6">
          <div className="border-b border-gov-gray-lighter bg-gov-gray-lightest px-5 py-3">
            <h2 className="font-semibold text-gov-navy">Label Image</h2>
            <p className="mt-1 text-sm text-gov-gray">Reference the source artwork while reviewing extracted and expected values.</p>
          </div>
          <div className="p-5">
            {imageUrl ? (
              <div className="rounded-lg border border-gov-gray-lighter bg-gov-gray-lightest p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Uploaded label under review" className="max-h-[34rem] w-full rounded-md bg-white object-contain" />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gov-gray-lighter bg-gov-gray-lightest p-8 text-center text-sm text-gov-gray">
                Label preview unavailable for this analysis.
              </div>
            )}
          </div>
        </div>

        {/* Field review cards */}
        <div className="space-y-4">
          <div className="bg-white rounded shadow-sm border border-gov-gray-lighter p-4">
            <h2 className="font-semibold text-gov-navy">Review Workspace</h2>
            <p className="mt-1 text-sm text-gov-gray">Likely matches and hard failures are separated so the manual review can stay focused.</p>
          </div>

          {allRows.map((field) => (
            <article
              key={field.name}
              className={`rounded-lg border p-4 shadow-sm ${CARD_STYLES[field.status]}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-gov-navy">{field.name}</p>
                  <p className="mt-1 text-sm text-gov-gray">{MATCH_LABELS[field.match]}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  <div className="min-w-24 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gov-gray">Extraction confidence</p>
                    <p className="mt-1 text-base font-bold text-gov-navy">{Math.round(field.score * 100)}%</p>
                  </div>
                  <Status status={field.status} />
                </div>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80" aria-hidden="true">
                <div
                  className={`h-full ${field.status === 'non_compliant' ? 'bg-gov-red' : field.status === 'warning' ? 'bg-gov-yellow' : 'bg-gov-green'}`}
                  style={{ width: `${Math.max(8, Math.round(field.score * 100))}%` }}
                />
              </div>

              {field.details && <p className="mt-3 text-sm leading-6 text-gov-gray">{field.details}</p>}

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <ValuePanel label="Extracted from label" value={field.found} />
                <ValuePanel label="Expected from application" value={field.expected} />
              </div>

              {(field.reason || field.fix) && (
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {field.reason && (
                    <div className="rounded border border-gov-gray-lighter bg-white/80 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gov-gray">Why this flagged</p>
                      <p className="mt-2 text-sm text-gov-gray">{field.reason}</p>
                    </div>
                  )}

                  {field.fix && (
                    <div className="rounded border border-gov-gray-lighter bg-white/80 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gov-gray">Suggested correction</p>
                      <p className="mt-2 text-sm text-gov-gray">{field.fix}</p>
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>

      {/* Government warning checklist */}
      <div className="bg-white rounded shadow-sm border border-gov-gray-lighter p-5">
        <h2 className="mb-4 font-semibold text-gov-navy">Government Warning Checklist</h2>
        <ul className="space-y-3">
          <CheckItem label="Warning statement present on label" passed={warning.present} />
          <CheckItem label='"GOVERNMENT WARNING:" appears in all-capital letters' passed={warning.caps} />
          <CheckItem label="Warning text matches required TTB wording exactly" passed={warning.exact} />
        </ul>

        {warning.found && !warning.exact && (
          <div className="mt-4 border-t border-gov-gray-lighter pt-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gov-gray">
              Extracted warning text
            </p>
            <p className="text-xs text-gov-gray font-mono bg-gov-gray-lightest rounded p-3 break-words">
              {warning.found}
            </p>
          </div>
        )}
      </div>

      {/* OCR diagnostics */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bg-white rounded shadow-sm border border-gov-gray-lighter p-5">
          <h2 className="font-semibold text-gov-navy">OCR Text</h2>
          <p className="mt-1 text-sm text-gov-gray">Use the raw extraction output to diagnose OCR misses and confirm borderline matches.</p>
          <div className="mt-4 max-h-96 overflow-auto rounded border border-gov-gray-lighter bg-gov-gray-lightest p-4">
            <pre className="text-xs text-gov-gray whitespace-pre-wrap font-mono">{ocr || 'No OCR text available.'}</pre>
          </div>
        </div>

        {/* Image preparation */}
        <div className="bg-white rounded shadow-sm border border-gov-gray-lighter p-5">
          <h2 className="font-semibold text-gov-navy">Image Preparation</h2>
          <p className="mt-1 text-sm text-gov-gray">Preprocessing steps applied before OCR to handle glare, rotation, and soft focus.</p>
          <div className="mt-4 rounded border border-gov-gray-lighter bg-gov-gray-lightest p-4">
            <div className="space-y-2.5">
              {steps.map((step) => (
                <div key={`${step.name}-${step.details}`} className="rounded border border-gov-gray-lighter bg-white p-3">
                  <p className="text-sm font-semibold text-gov-navy">{step.name}</p>
                  <p className="text-xs text-gov-gray mt-1">{step.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
