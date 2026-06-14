'use client';

import { useCallback, useRef, useState } from 'react';

interface Props {
  onFilesSelect: (files: File[]) => void;
  selectedFiles: File[];
  disabled?: boolean;
}

const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 20;
const MAX_BATCH_FILES = 300;

export default function Upload({ onFilesSelect, selectedFiles, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    (incomingFiles: FileList | File[]) => {
      const files = Array.from(incomingFiles);
      setError(null);
      if (!files.length) {
        return;
      }

      if (files.length > MAX_BATCH_FILES) {
        setError(`Please upload no more than ${MAX_BATCH_FILES} images at a time.`);
        return;
      }

      const invalidFile = files.find((file) => !ACCEPTED_MIME.includes(file.type));
      if (invalidFile) {
        setError('Please upload JPEG, PNG, or WebP images only.');
        return;
      }

      const oversizedFile = files.find((file) => file.size > MAX_MB * 1024 * 1024);
      if (oversizedFile) {
        setError(`Each file must be smaller than ${MAX_MB} MB.`);
        return;
      }

      onFilesSelect(files);
    },
    [onFilesSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (!disabled) processFile(e.dataTransfer.files);
    },
    [disabled, processFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) processFile(e.target.files);
    },
    [processFile],
  );

  const handleClear = useCallback(() => {
    setError(null);
    onFilesSelect([]);
    if (inputRef.current) inputRef.current.value = '';
  }, [onFilesSelect]);

  if (selectedFiles.length > 0) {
    return (
      <div className="space-y-3">
        {/* Selection summary */}
        <div className="flex flex-wrap items-start justify-between gap-3 rounded border border-gov-gray-lighter bg-gov-gray-lightest px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gov-navy">
              {selectedFiles.length === 1 ? 'Single-label review' : 'Batch review queue'}
            </p>
            <p className="mt-1 text-sm text-gov-gray">
              {selectedFiles.length === 1
                ? '1 label is ready for OCR and compliance checks.'
                : `${selectedFiles.length} labels are staged and ready for sequential processing.`}
            </p>
          </div>
          {!disabled && (
            <button onClick={handleClear} className="text-sm font-medium text-gov-blue hover:underline focus:outline-none">
              Clear selection
            </button>
          )}
        </div>

        {/* Selected file list */}
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {selectedFiles.slice(0, 6).map((file) => (
            <div key={`${file.name}-${file.size}`} className="rounded border border-gov-gray-lighter bg-white px-3 py-2.5">
              <p className="truncate text-sm font-medium text-gov-navy">{file.name}</p>
              <p className="mt-1 text-xs text-gov-gray">
                {(file.size / 1024).toFixed(0)} KB &middot; {file.type}
              </p>
            </div>
          ))}
        </div>
        {selectedFiles.length > 6 && (
          <p className="text-xs text-gov-gray">Showing 6 of {selectedFiles.length} selected labels.</p>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Upload dropzone */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload label image"
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
        className={[
          'rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors sm:p-10',
          'focus:outline-none focus:ring-2 focus:ring-gov-blue focus:ring-offset-2',
          isDragOver
            ? 'border-gov-blue bg-blue-50'
            : 'border-gov-gray-lighter hover:border-gov-blue hover:bg-blue-50',
          disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
        ].join(' ')}
      >
        <svg
          className="mx-auto mb-3 h-12 w-12 text-gov-gray-light"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
          aria-hidden="true"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-base font-semibold text-gov-navy sm:text-lg">
          {isDragOver ? 'Drop image here' : 'Click to upload or drag and drop'}
        </p>
        <p className="mt-1 text-sm text-gov-gray">JPEG, PNG, or WebP</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-gov-gray">
          <span className="rounded-full border border-gov-gray-lighter bg-white px-3 py-1">Up to {MAX_MB} MB each</span>
          <span className="rounded-full border border-gov-gray-lighter bg-white px-3 py-1">Up to {MAX_BATCH_FILES} labels per batch</span>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME.join(',')}
        multiple
        onChange={handleChange}
        className="sr-only"
        disabled={disabled}
        aria-hidden="true"
      />

      {/* Upload error */}
      {error && (
        <p role="alert" className="mt-2 text-sm text-gov-red flex items-center gap-1.5">
          <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
