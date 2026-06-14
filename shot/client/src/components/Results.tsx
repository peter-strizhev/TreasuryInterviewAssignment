import type { BatchJob, BatchJobStatus } from '@/types/domain';
import Status from './Status';

interface Props {
  job: BatchJob;
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onExport: () => void;
  processingProgress?: number;
  processingLabel?: string;
}

function getReviewOutcomeMessage(item: BatchJob['items'][number], probableMatches: number, hardFailures: number) {
  if (item.status === 'failed') {
    const errorMessage = item.error?.trim().toLowerCase() ?? '';
    if (!errorMessage || /(ocr|text|read|extract)/.test(errorMessage)) {
      return 'No readable text detected';
    }

    return item.error!.trim();
  }

  const outcome = item.result?.outcome?.trim();
  if (outcome) {
    return outcome;
  }

  return `${probableMatches} probable matches, ${hardFailures} hard failures`;
}

function getQueueProgress(status: BatchJobStatus, activeProgress: number) {
  if (status === 'completed') {
    return { progress: 100, label: 'Completed', barClassName: 'bg-gov-green' };
  }

  if (status === 'failed') {
    return { progress: 100, label: 'Failed', barClassName: 'bg-gov-red' };
  }

  if (status === 'processing') {
    return { progress: activeProgress, label: 'Processing', barClassName: 'bg-gov-blue' };
  }

  return { progress: 0, label: 'Queued', barClassName: 'bg-gov-gray-light' };
}

function formatElapsedMs(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return '';
  }

  if (value < 1000) {
    return `${Math.round(value)} ms`;
  }

  return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)} s`;
}

function getComputeTimeLabel(item: BatchJob['items'][number]) {
  return formatElapsedMs(item.elapsed);
}

export default function Results({ job, selectedItemId, onSelectItem, onExport, processingProgress = 0, processingLabel = 'Queued' }: Props) {
  const shouldScrollBatchItems = job.items.length > 10;
  const isSingleReview = job.items.length === 1;

  return (
    <section className="space-y-3" aria-label={isSingleReview ? 'Single Label Results' : 'Batch Results'}>
      {/* Queue summary */}
      <div className="bg-white rounded shadow-sm border border-gov-gray-lighter p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-semibold text-gov-navy">{isSingleReview ? 'Single Label Review' : 'Batch Processing Queue'}</h2>
            <p className="mt-1 text-sm text-gov-gray">
              {isSingleReview
                ? 'Track the active review and inspect the completed validation details below.'
                : 'Track each uploaded label, watch live progress in the queue, and open completed items for detailed review.'}
            </p>
          </div>
          <button
            onClick={onExport}
            disabled={job.summary.completed === 0}
            className="rounded border border-gov-blue px-4 py-2 text-sm font-medium text-gov-blue hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export Results CSV
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5 text-sm lg:grid-cols-5">
          <div className="rounded border border-gov-gray-lighter bg-gov-gray-lightest p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gov-gray">Total</p>
            <p className="mt-1 text-xl font-bold text-gov-blue">{job.summary.total}</p>
          </div>
          <div className="rounded border border-gov-gray-lighter bg-gov-gray-lightest p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gov-gray">Queued</p>
            <p className="mt-1 text-xl font-bold text-gov-navy">{job.summary.queued}</p>
          </div>
          <div className="rounded border border-gov-gray-lighter bg-yellow-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gov-gray">Processing</p>
            <p className="mt-1 text-xl font-bold text-gov-navy">{job.summary.processing}</p>
          </div>
          <div className="rounded border border-gov-gray-lighter bg-green-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gov-gray">Completed</p>
            <p className="mt-1 text-xl font-bold text-gov-green">{job.summary.completed}</p>
          </div>
          <div className="rounded border border-gov-gray-lighter bg-red-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gov-gray">Failed</p>
            <p className="mt-1 text-xl font-bold text-gov-red">{job.summary.failed}</p>
          </div>
        </div>
      </div>

      {/* Queue table */}
      <div className="bg-white rounded shadow-sm border border-gov-gray-lighter overflow-hidden">
        <div className={shouldScrollBatchItems ? 'max-h-[44rem] overflow-auto' : 'overflow-x-auto'}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gov-navy text-white">
                <th className="sticky top-0 z-10 bg-gov-navy px-4 py-2.5 text-left font-medium">Label File</th>
                <th className="sticky top-0 z-10 w-[26rem] min-w-[24rem] bg-gov-navy px-4 py-2.5 text-left font-medium">Queue Progress</th>
                <th className="sticky top-0 z-10 bg-gov-navy px-4 py-2.5 text-left font-medium">Elapsed Time</th>
                <th className="sticky top-0 z-10 bg-gov-navy px-4 py-2.5 text-left font-medium">Review Outcome</th>
                {!isSingleReview && <th className="sticky top-0 z-10 bg-gov-navy px-4 py-2.5 text-left font-medium">Action</th>}
              </tr>
            </thead>
            <tbody>
              {job.items.map((item, index) => {
                const queueProgress = getQueueProgress(item.status, processingProgress);
                const probableMatches = item.result
                  ? [...item.result.fields, item.result.warning].filter((field) => field.match === 'probable').length
                  : 0;
                const hardFailures = item.result
                  ? [...item.result.fields, item.result.warning].filter((field) => field.status === 'non_compliant').length
                  : 0;
                const isSelected = selectedItemId === item.id;
                const reviewOutcomeMessage = getReviewOutcomeMessage(item, probableMatches, hardFailures);

                return (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gov-gray-lightest'}>
                    <td className="px-4 py-3 align-top font-medium text-gov-navy">{item.file}</td>
                    <td className="min-w-[24rem] px-4 py-3 align-top">
                      <div className="h-2 rounded-full bg-white overflow-hidden" aria-hidden="true">
                        <div
                          className={`h-full transition-all duration-300 ease-out ${queueProgress.barClassName}`}
                          style={{ width: `${queueProgress.progress}%` }}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-gov-gray">
                        <span>{item.status === 'processing' ? processingLabel : queueProgress.label}</span>
                        <span>{queueProgress.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gov-gray">
                      {getComputeTimeLabel(item)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {item.result || item.status === 'failed' ? (
                        <>
                          <Status status={item.result?.status ?? 'non_compliant'} />
                          <p className="text-xs text-gov-gray mt-1">
                            {reviewOutcomeMessage}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs text-gov-gray">Awaiting result</span>
                      )}
                    </td>
                    {!isSingleReview && (
                      <td className="px-4 py-3 align-top">
                        {item.result ? (
                          <button
                            onClick={() => onSelectItem(item.id)}
                            className={`inline-flex min-w-[7.5rem] items-center justify-center whitespace-nowrap px-3 py-1.5 rounded border text-xs font-medium ${
                              isSelected
                                ? 'border-gov-blue bg-blue-50 text-gov-blue'
                                : 'border-gov-gray-lighter text-gov-navy hover:bg-gov-gray-lightest'
                            }`}
                          >
                            {isSelected ? 'Close Review' : 'Open Review'}
                          </button>
                        ) : (
                          <span className="text-xs text-gov-gray">Not ready</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}