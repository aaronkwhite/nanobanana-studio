'use client';

import { ImageIcon, Download, X, Loader2 } from 'lucide-react';

interface FileItemProps {
  file: {
    id: string;
    name: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    outputPath?: string | null;
    error?: string | null;
    preview?: string;
  };
  onRemove?: (id: string) => void;
}

export function FileItem({ file, onRemove }: FileItemProps) {
  const statusLabels = {
    pending: 'Pending',
    processing: 'Transforming...',
    completed: 'Complete',
    failed: 'Failed',
  };

  const statusColors = {
    pending: 'bg-primary/20 text-primary border border-primary/30',
    processing: 'bg-processing/20 text-processing border border-processing/30',
    completed: 'bg-success text-success-foreground',
    failed: 'bg-error/20 text-error border border-error/30',
  };

  const getFilename = (path: string) => path.split('/').pop() || 'image.png';

  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border">
      {/* Thumbnail */}
      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
        {file.preview ? (
          <img src={file.preview} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-5 h-5 text-muted-foreground" />
        )}
      </div>

      {/* File name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        {file.error && (
          <p className="text-xs text-error mt-1 truncate">{file.error}</p>
        )}
      </div>

      {/* Status badge - not shown for complete */}
      {file.status !== 'completed' && (
        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[file.status]}`}>
          {file.status === 'processing' && (
            <Loader2 className="animate-spin -ml-1 mr-1.5 h-3 w-3" />
          )}
          {statusLabels[file.status]}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {file.status === 'completed' && file.outputPath && (
          <a
            href={`/api/download/${getFilename(file.outputPath)}`}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" />
            Download
          </a>
        )}

        {file.status === 'pending' && onRemove && (
          <button
            onClick={() => onRemove(file.id)}
            className="p-1.5 text-muted-foreground hover:text-error transition-colors"
            title="Remove"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
