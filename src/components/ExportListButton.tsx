'use client';

import { useState } from 'react';

interface ExportListButtonProps {
  label: string;
  // Runs the export. It can report progress text while running and return a summary to show afterwards.
  exportList: (reportProgress: (message: string) => void) => Promise<string | void>;
  disabled?: boolean;
}

// Button that runs an async export and shows its progress, result and any error.
export default function ExportListButton({ label, exportList, disabled }: ExportListButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setExporting(true);
    setProgress('');
    setSummary(null);
    setError(null);
    try {
      const result = await exportList(setProgress);
      if (result) setSummary(result);
    } catch (err) {
      console.error('Export failed:', err);
      setError(`Export failed: ${err instanceof Error ? err.message : 'Unexpected error'}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || exporting}
        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exporting ? progress || 'Preparing export...' : label}
      </button>
      {summary && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400" role="status">
          {summary}
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
