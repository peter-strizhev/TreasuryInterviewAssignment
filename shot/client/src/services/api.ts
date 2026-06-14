import type { BatchJob, ExpectedValues, LabelAnalysisResult } from '@/types/domain';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unexpected server error' }));
    throw new Error(error.detail ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function analyzeLabel(
  file: File,
  expected: ExpectedValues,
): Promise<LabelAnalysisResult> {
  const body = new FormData();
  body.append('image', file);
  body.append('expected', JSON.stringify(expected));

  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    body,
  });

  return parseResponse<LabelAnalysisResult>(response);
}

export async function createBatchJob(
  files: File[],
  expected: ExpectedValues,
): Promise<BatchJob> {
  const body = new FormData();
  files.forEach((file) => body.append('images', file));
  body.append('expected', JSON.stringify(expected));

  const response = await fetch(`${API_BASE}/api/batches`, {
    method: 'POST',
    body,
  });

  return parseResponse<BatchJob>(response);
}

export async function getBatchJob(jobId: string): Promise<BatchJob> {
  const response = await fetch(`${API_BASE}/api/batches/${jobId}`);
  return parseResponse<BatchJob>(response);
}

export function buildCsv(job: BatchJob): string {
  const header = [
    'File Name',
    'Item Status',
    'Overall Status',
    'Processing Time (ms)',
    'Probable Matches',
    'Hard Failures',
    'OCR Text',
    'Error',
  ];

  const rows = job.items.map((item) => {
    const result = item.result;
    const allRows = result ? [...result.fields, result.warning] : [];
    const probableMatches = allRows.filter((field) => field.match === 'probable').length;
    const hardFailures = allRows.filter((field) => field.status === 'non_compliant').length;

    return [
      item.file,
      item.status,
      result?.status ?? '',
      result ? result.elapsed.toFixed(0) : '',
      String(probableMatches),
      String(hardFailures),
      result?.ocr?.replace(/\s+/g, ' ').trim() ?? '',
      item.error ?? '',
    ];
  });

  return [header, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}
