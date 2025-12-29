'use client';

import { X, ImageIcon } from 'lucide-react';

interface AttachmentChip {
  id: string;
  name: string;
  preview?: string;
}

interface AttachmentChipsProps {
  files: AttachmentChip[];
  onRemove: (id: string) => void;
}

export function AttachmentChips({ files, onRemove }: AttachmentChipsProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {files.map(file => (
        <div key={file.id} className="relative group">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
            {file.preview ? (
              <img src={file.preview} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <button
            onClick={() => onRemove(file.id)}
            className="absolute -top-1 -right-1 p-0.5 bg-background border border-border rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
