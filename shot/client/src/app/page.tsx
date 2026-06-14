'use client';

import { useCallback, useEffect, useState } from 'react';
import Results from '@/components/Results';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Upload from '@/components/Upload';
import ExpectedForm from '@/components/ExpectedForm';
import Validation from '@/components/Validation';
import { analyzeLabel, buildCsv, createBatchJob, getBatchJob } from '@/services/api';
import type { AnalysisState, BatchJob, ExpectedValues } from '@/types/domain';

const SINGLE_ITEM_ID = 'single-item';
const WATERMARK = 'Created by Peter Strizhev for US Treasury Interview';

const PROGRESS_STAGES = [
  { uptoMs: 600, progress: 18, label: 'Uploading label image' },
  { uptoMs: 2600, progress: 58, label: 'Extracting label text' },
  { uptoMs: 4500, progress: 86, label: 'Comparing against application values' },
  { uptoMs: Number.POSITIVE_INFINITY, progress: 96, label: 'Finalizing review package' },
];

function buildSingleJob(file: File, state: Extract<AnalysisState, { type: 'processing-single' | 'success' }>): BatchJob {
  const done = state.type === 'success';
  const itemStatus: BatchJob['items'][number]['status'] = done ? 'completed' : 'processing';
  const doneAtMs = done ? state.startedAtMs + state.result.elapsed : null;
  const item = {
    id: SINGLE_ITEM_ID,
    file: file.name,
    status: itemStatus,
    result: done ? state.result : null,
    error: null,
    started: new Date(state.startedAtMs).toISOString(),
    done: doneAtMs ? new Date(doneAtMs).toISOString() : null,
    elapsed: done ? state.result.elapsed : null,
  };

  return {
    id: 'single-review',
    created: '',
    updated: '',
    status: itemStatus,
    summary: {
      total: 1,
      queued: 0,
      processing: done ? 0 : 1,
      completed: done ? 1 : 0,
      failed: 0,
    },
    items: [item],
    watermark: WATERMARK,
  };
}

export default function Home() {
  const [selected, setSelected] = useState<File[]>([]);
  const [expected, setExpected] = useState<ExpectedValues>({});
  const [state, setState] = useState<AnalysisState>({ type: 'idle' });
  const [timer, setTimer] = useState(0);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (state.type !== 'processing-single' && state.type !== 'processing-batch') {
      setTimer(0);
      return;
    }

    const start = Date.now();
    const intervalId = window.setInterval(() => {
      setTimer(Date.now() - start);
    }, 120);

    return () => window.clearInterval(intervalId);
  }, [state.type]);

  useEffect(() => {
    if (!selected.length) {
      setUrls({});
      return;
    }

    const next = Object.fromEntries(
      selected.map((file) => [`${file.name}-${file.size}-${file.lastModified}`, URL.createObjectURL(file)]),
    );
    setUrls(next);

    return () => {
      Object.values(next).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selected]);

  useEffect(() => {
    if (state.type !== 'processing-batch') return;

    const intervalId = window.setInterval(async () => {
      try {
        const job = await getBatchJob(state.job.id);
        if (job.status === 'completed' || job.status === 'failed') {
          setState({ type: 'batch-success', job });
          setOpenId(null);
          window.clearInterval(intervalId);
          return;
        }
        setState({ type: 'processing-batch', job });
      } catch (error) {
        window.clearInterval(intervalId);
        setState({
          type: 'error',
          message: error instanceof Error ? error.message : 'Batch polling failed. Please try again.',
        });
      }
    }, 1200);

    return () => window.clearInterval(intervalId);
  }, [state]);

  const handleAnalyze = useCallback(async () => {
    if (!selected.length) return;

    try {
      if (selected.length === 1) {
        const startedAtMs = Date.now();
        setOpenId(null);
        setState({ type: 'processing-single', startedAtMs });
        const result = await analyzeLabel(selected[0], expected);
        setState({ type: 'success', result, startedAtMs });
        return;
      }

      const job = await createBatchJob(selected, expected);
      setOpenId(null);
      setState({ type: 'processing-batch', job });
    } catch (err) {
      setState({
        type: 'error',
        message: err instanceof Error ? err.message : 'Analysis failed. Please try again.',
      });
    }
  }, [expected, selected]);

  const handleReset = useCallback(() => {
    setSelected([]);
    setExpected({});
    setState({ type: 'idle' });
    setOpenId(null);
  }, []);

  const exportBatch = useCallback((job: BatchJob) => {
    const csv = buildCsv(job);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `s-h-o-t-batch-${job.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const isProcessing = state.type === 'processing-single' || state.type === 'processing-batch';
  const activeStage = PROGRESS_STAGES.find((stage) => timer <= stage.uptoMs) ?? PROGRESS_STAGES[PROGRESS_STAGES.length - 1];
  const isBatchMode = selected.length > 1 || state.type === 'processing-batch' || state.type === 'batch-success';
  const queueJob =
    state.type === 'processing-batch' || state.type === 'batch-success'
      ? state.job
      : selected[0] && (state.type === 'processing-single' || state.type === 'success')
      ? buildSingleJob(selected[0], state)
      : null;
  const selectedQueueItemId =
    state.type === 'success'
      ? SINGLE_ITEM_ID
      : state.type === 'processing-batch' || state.type === 'batch-success'
      ? openId
      : null;
  const selectedQueueItem = queueJob?.items.find((item) => item.id === selectedQueueItemId && item.result) ?? null;
  const selectedQueueImageUrl = selectedQueueItem
    ? urls[
        `${selected.find((file) => file.name === selectedQueueItem.file)?.name ?? ''}-${selected.find((file) => file.name === selectedQueueItem.file)?.size ?? ''}-${selected.find((file) => file.name === selectedQueueItem.file)?.lastModified ?? ''}`
      ] ?? null
    : null;

  const handleSelectQueueItem = useCallback((itemId: string) => {
    setOpenId((current) => (current === itemId ? null : itemId));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f8]" data-watermark={WATERMARK}>
      {/* Watermark */}
      <span hidden aria-hidden="true">
        {WATERMARK}
      </span>

      {/* Page header */}
      <Header />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-5 sm:px-6 lg:px-8" data-watermark={WATERMARK}>
        {/* Product intro */}
        <section className="rounded-sm border border-slate-200 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] lg:px-6" data-watermark={WATERMARK}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gov-blue">Alcohol and Tobacco Tax and Trade Bureau</p>
              <h1 className="mt-2 text-[1.85rem] font-semibold leading-tight text-gov-navy">S.H.O.T</h1>
              <p className="mt-1 text-sm font-medium tracking-[0.02em] text-gov-blue">Smart Heuristic OCR and TTB Validator</p>
              <span hidden aria-hidden="true">
                {WATERMARK}
              </span>
            </div>
          </div>
        </section>

        {/* Intake workspace */}
        <section className="grid gap-5 xl:grid-cols-[1.05fr,0.95fr]">
          {/* File upload */}
          <section className="bg-white rounded border border-gov-gray-lighter shadow-sm overflow-hidden">
            <div className="border-b border-gov-gray-lighter bg-gov-gray-lightest px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gov-blue text-xs font-bold text-white">1</span>
                <div>
                  <h2 className="font-semibold text-gov-navy">Upload label images</h2>
                  <p className="text-xs text-gov-gray">Single or batch intake with immediate file review.</p>
                </div>
              </div>
              {selected.length > 0 && <span className="text-xs font-medium text-gov-gray">{selected.length} selected</span>}
            </div>
            <div className="p-5">
              <Upload onFilesSelect={setSelected} selectedFiles={selected} disabled={isProcessing} />
            </div>
          </section>

          {/* Expected values */}
          <section className="bg-white rounded border border-gov-gray-lighter shadow-sm overflow-hidden">
            <div className="border-b border-gov-gray-lighter bg-gov-gray-lightest px-5 py-3 flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gov-blue text-xs font-bold text-white">2</span>
              <div>
                <h2 className="font-semibold text-gov-navy">
                  Application values
                  <span className="ml-2 text-xs font-normal text-gov-gray">Optional</span>
                </h2>
                <p className="text-xs text-gov-gray">Provide submission values when you want comparison, or leave blank for OCR-only review.</p>
              </div>
            </div>
            <div className="p-5">
              <ExpectedForm values={expected} onChange={setExpected} disabled={isProcessing} />
            </div>
          </section>
        </section>

        {/* Review actions */}
        <section className="rounded border border-gov-gray-lighter bg-white px-5 py-4 shadow-sm" data-watermark={WATERMARK}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-gov-navy">Review controls</p>
              <p className="mt-1 text-sm text-gov-gray">
                {selected.length
                  ? isBatchMode
                    ? 'Run the selected queue and open completed labels for detailed review as they finish.'
                    : 'Start a single-label pass and review the extracted values below.'
                  : 'Select at least one label image to enable analysis.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleAnalyze}
                disabled={!selected.length || isProcessing}
                className="inline-flex items-center justify-center px-6 py-2.5 bg-gov-blue text-white font-bold text-sm rounded hover:bg-gov-blue-dark active:bg-gov-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-gov-blue focus:ring-offset-2"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing label…
                  </span>
                ) : (
                  isBatchMode ? 'Start Batch Review' : 'Analyze Label'
                )}
              </button>

              {(state.type === 'success' || state.type === 'error') && (
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 border border-gov-gray-light text-gov-gray font-medium text-sm rounded hover:bg-gov-gray-lighter transition-colors focus:outline-none focus:ring-2 focus:ring-gov-gray"
                >
                  Start New Analysis
                </button>
              )}
            </div>
          </div>
        </section>

        <div hidden aria-hidden="true" data-watermark={WATERMARK}>
          {WATERMARK}
        </div>

        {/* Error alert */}
        {state.type === 'error' && (
          <div role="alert" className="flex gap-3 rounded border border-red-200 bg-red-50 p-4">
            <svg className="h-5 w-5 text-gov-red flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-semibold text-gov-red">Analysis Failed</p>
              <p className="text-sm text-red-700 mt-1">{state.message}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {queueJob && (
          <>
            <Results
              job={queueJob}
              selectedItemId={selectedQueueItemId}
              onSelectItem={handleSelectQueueItem}
              onExport={() => exportBatch(queueJob)}
              processingProgress={isProcessing ? activeStage.progress : 100}
              processingLabel={activeStage.label}
            />

            {selectedQueueItem?.result && (
              <Validation result={selectedQueueItem.result} imageUrl={selectedQueueImageUrl} />
            )}
          </>
        )}
      </main>

      {/* Page footer */}
      <Footer />
    </div>
  );
}
