'use client';

import { useState, useCallback } from 'react';
import { AttachmentChips } from './AttachmentChips';
import { ArrowUp, Loader2, Maximize, RectangleHorizontal, Thermometer, ChevronDown, CloudUpload, X } from 'lucide-react';

type OutputSize = '1K' | '2K' | '4K';
type Temperature = 0 | 0.5 | 1 | 1.5 | 2;
type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

const SIZE_OPTIONS: { value: OutputSize; label: string; price: string }[] = [
  { value: '1K', label: '1K', price: '$0.02' },
  { value: '2K', label: '2K', price: '$0.07' },
  { value: '4K', label: '4K', price: '$0.12' },
];

const ASPECT_RATIO_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: '1:1', label: 'Square' },
  { value: '16:9', label: 'Wide' },
  { value: '9:16', label: 'Portrait' },
  { value: '4:3', label: 'Landscape' },
  { value: '3:4', label: 'Tall' },
];

const TEMPERATURES: Temperature[] = [0, 0.5, 1, 1.5, 2];

interface UploadedFile {
  id: string;
  path: string;
  name: string;
  preview?: string;
}

interface ImageToImageFormProps {
  onSubmit: (data: {
    prompt: string;
    files: UploadedFile[];
    outputSize: OutputSize;
    temperature: Temperature;
    aspectRatio: AspectRatio;
  }) => void;
  disabled?: boolean;
}

export function ImageToImageForm({
  onSubmit,
  disabled = false,
}: ImageToImageFormProps) {
  const [prompt, setPrompt] = useState('');
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([]);
  const [outputSize, setOutputSize] = useState<OutputSize>('1K');
  const [temperature, setTemperature] = useState<Temperature>(1);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [activeMenu, setActiveMenu] = useState<'size' | 'aspect' | 'temp' | null>(null);

  // Drop zone state
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const closeMenus = () => setActiveMenu(null);

  const handleSubmit = () => {
    if (prompt.trim() && pendingFiles.length > 0) {
      onSubmit({
        prompt: prompt.trim(),
        files: pendingFiles,
        outputSize,
        temperature,
        aspectRatio,
      });
      setPendingFiles([]);
    }
  };

  const handleRemovePending = useCallback((id: string) => {
    setPendingFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // Upload functionality
  const createPreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const uploadFiles = async (fileList: FileList | File[]) => {
    const filesToUpload = Array.from(fileList).filter(f => f.type.startsWith('image/'));

    if (filesToUpload.length === 0) {
      setUploadError('Please select image files');
      return;
    }

    if (pendingFiles.length + filesToUpload.length > 20) {
      setUploadError('Maximum 20 files allowed');
      return;
    }

    setUploading(true);
    setUploadError(null);

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
        setUploadError(data.error || 'Failed to upload files');
        return;
      }

      const newFiles: UploadedFile[] = await Promise.all(
        data.files.map(async (f: UploadedFile, i: number) => {
          const file = filesToUpload[i];
          const preview = await createPreview(file);
          return { ...f, preview };
        })
      );

      setPendingFiles(prev => [...prev, ...newFiles]);
    } catch {
      setUploadError('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (!disabled && e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [disabled, pendingFiles]
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

  const canSubmit = prompt.trim().length > 0 && pendingFiles.length > 0 && !disabled;

  return (
    <div className="space-y-4">
      {/* Combined input card */}
      <div className="bg-muted/50 border border-border rounded-xl shadow-md">
        {/* Drop zone area */}
        <div className="p-4">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative border-2 border-dashed rounded-xl px-6 py-10 text-center transition-all overflow-hidden ${
              isDragOver
                ? 'border-primary bg-primary/20'
                : disabled
                ? 'border-border bg-muted/50 cursor-not-allowed'
                : 'bg-primary/5 border-primary/30 hover:bg-primary/10 hover:border-primary/50 cursor-pointer'
            }`}
          >
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed overflow-hidden"
            style={{ fontSize: 0 }}
          />
          <CloudUpload className={`w-6 h-6 mx-auto mb-1 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-sm font-medium">
              {uploading ? 'Uploading...' : isDragOver ? 'Drop images here' : 'Drag & drop images here'}
            </p>
            <p className="text-xs text-muted-foreground">or click to browse</p>
          </div>
        </div>

        {/* Inline attachment thumbnails */}
        {pendingFiles.length > 0 && (
          <div className="px-4 pb-2">
            <AttachmentChips
              files={pendingFiles}
              onRemove={handleRemovePending}
            />
          </div>
        )}

        {/* Textarea */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe how to transform the images..."
          disabled={disabled}
          rows={2}
          className="w-full px-4 pt-3 pb-2 bg-transparent resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-foreground placeholder:text-placeholder"
        />

        {/* Bottom bar with settings */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-1">
            {/* Size selector */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'size' ? null : 'size')}
                className="flex items-center gap-1 px-2 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                title="Output resolution"
              >
                <Maximize className="w-3.5 h-3.5" />
                <span className="font-medium">{outputSize}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {activeMenu === 'size' && (
                <>
                  <div className="fixed inset-0 z-10 overflow-hidden" onClick={closeMenus} />
                  <div className="absolute top-full left-0 mt-1 py-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[100px]">
                    {SIZE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => { setOutputSize(option.value); closeMenus(); }}
                        className={`w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors flex justify-between items-center gap-3 ${
                          outputSize === option.value ? 'text-primary font-medium' : ''
                        }`}
                      >
                        <span>{option.label}</span>
                        <span className="text-muted-foreground text-xs">{option.price}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Aspect ratio selector */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'aspect' ? null : 'aspect')}
                className="flex items-center gap-1 px-2 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                title="Image dimensions"
              >
                <RectangleHorizontal className="w-3.5 h-3.5" />
                <span className="font-medium">{ASPECT_RATIO_OPTIONS.find(o => o.value === aspectRatio)?.label}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {activeMenu === 'aspect' && (
                <>
                  <div className="fixed inset-0 z-10 overflow-hidden" onClick={closeMenus} />
                  <div className="absolute top-full left-0 mt-1 py-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[120px]">
                    {ASPECT_RATIO_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => { setAspectRatio(option.value); closeMenus(); }}
                        className={`w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors flex justify-between items-center gap-3 ${
                          aspectRatio === option.value ? 'text-primary font-medium' : ''
                        }`}
                      >
                        <span>{option.label}</span>
                        <span className="text-muted-foreground text-xs">{option.value}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Temperature selector */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'temp' ? null : 'temp')}
                className="flex items-center gap-1 px-2 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                title="Creativity (0=precise, 2=creative)"
              >
                <Thermometer className="w-3.5 h-3.5" />
                <span className="font-medium">{temperature}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {activeMenu === 'temp' && (
                <>
                  <div className="fixed inset-0 z-10 overflow-hidden" onClick={closeMenus} />
                  <div className="absolute top-full left-0 mt-1 py-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[60px]">
                    {TEMPERATURES.map((temp) => (
                      <button
                        key={temp}
                        onClick={() => { setTemperature(temp); closeMenus(); }}
                        className={`w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors ${
                          temperature === temp ? 'text-primary font-medium' : ''
                        }`}
                      >
                        {temp}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={disabled || !canSubmit}
            className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowUp className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Upload error */}
      {uploadError && <p className="text-sm text-error">{uploadError}</p>}
    </div>
  );
}
