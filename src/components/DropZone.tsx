'use client';

import { useCallback, useState } from 'react';
import { CloudUpload } from 'lucide-react';

interface UploadedFile {
  id: string;
  path: string;
  name: string;
  preview?: string;
}

interface DropZoneProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

export function DropZone({ files, onFilesChange, disabled = false, maxFiles = 10 }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = async (fileList: FileList | File[]) => {
    const filesToUpload = Array.from(fileList).filter(f => f.type.startsWith('image/'));

    if (filesToUpload.length === 0) {
      setError('Please select image files (JPEG, PNG, WebP, GIF)');
      return;
    }

    if (files.length + filesToUpload.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      for (const file of filesToUpload) {
        formData.append('files', file);
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to upload files');
        return;
      }

      // Create previews for uploaded files
      const newFiles: UploadedFile[] = await Promise.all(
        data.files.map(async (f: UploadedFile, i: number) => {
          const file = filesToUpload[i];
          const preview = await createPreview(file);
          return { ...f, preview };
        })
      );

      onFilesChange([...files, ...newFiles]);
    } catch {
      setError('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const createPreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (!disabled && e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [disabled, files, onFilesChange, maxFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors overflow-hidden ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : disabled
            ? 'border-border bg-muted/50 cursor-not-allowed'
            : 'border-border hover:border-primary/50 cursor-pointer'
        }`}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          style={{ fontSize: 0 }}
        />
        <CloudUpload className={`w-8 h-8 mx-auto mb-2 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
        <p className="text-sm font-medium">
          {uploading ? 'Uploading...' : isDragOver ? 'Drop images here' : 'Drag & drop images here'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
      </div>

      {/* Error message */}
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
