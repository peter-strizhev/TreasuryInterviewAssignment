export type ComplianceStatus = 'compliant' | 'non_compliant' | 'warning' | 'not_checked';
export type MatchType = 'exact' | 'probable' | 'mismatch' | 'missing' | 'not_checked';
export type BatchJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface FieldValidation {
  name: string;
  found: string | null;
  expected: string | null;
  status: ComplianceStatus;
  details: string | null;
  match: MatchType;
  score: number;
  reason: string | null;
  fix: string | null;
}

export interface OCRPreprocessingStep {
  name: string;
  applied: boolean;
  details: string | null;
}

export interface TimingMetric {
  name: string;
  ms: number;
}

export interface ProcessingMetrics {
  total: number;
  target: number;
  ok: boolean;
  stages: TimingMetric[];
}

export interface GovernmentWarningValidation extends FieldValidation {
  present: boolean;
  caps: boolean;
  exact: boolean;
}

export interface LabelAnalysisResult {
  session: string;
  timestamp: string;
  fields: FieldValidation[];
  warning: GovernmentWarningValidation;
  status: ComplianceStatus;
  outcome: string | null;
  elapsed: number;
  metrics: ProcessingMetrics;
  ocr: string;
  steps: OCRPreprocessingStep[];
  watermark: string;
}

export interface BatchJobItemResult {
  id: string;
  file: string;
  status: BatchJobStatus;
  result: LabelAnalysisResult | null;
  error: string | null;
  started: string | null;
  done: string | null;
  elapsed: number | null;
}

export interface BatchJobSummary {
  total: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface BatchJob {
  id: string;
  created: string;
  updated: string;
  status: BatchJobStatus;
  summary: BatchJobSummary;
  items: BatchJobItemResult[];
  watermark: string;
}

export interface ExpectedValues {
  brand?: string;
  class_type?: string;
  abv?: string;
  net?: string;
}

export type AnalysisState =
  | { type: 'idle' }
  | { type: 'processing-single'; startedAtMs: number }
  | { type: 'processing-batch'; job: BatchJob }
  | { type: 'success'; result: LabelAnalysisResult; startedAtMs: number }
  | { type: 'batch-success'; job: BatchJob }
  | { type: 'error'; message: string };
