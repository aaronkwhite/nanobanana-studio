'use client';

import { FileItem } from './FileItem';

interface FileRecord {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputPath?: string | null;
  error?: string | null;
  preview?: string;
}

interface FileListProps {
  files: FileRecord[];
  onRemove?: (id: string) => void;
}

export function FileList({ files, onRemove }: FileListProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {files.map(file => (
        <FileItem
          key={file.id}
          file={file}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
