'use client';

import { ImageItem } from './ImageItem';

export interface ImageResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  inputPrompt?: string;
  inputImagePath?: string;
  outputImagePath?: string;
  error?: string;
}

interface ImageGridProps {
  images: ImageResult[];
  title?: string;
}

export function ImageGrid({ images, title }: ImageGridProps) {
  if (images.length === 0) return null;

  const completed = images.filter((i) => i.status === 'completed').length;
  const failed = images.filter((i) => i.status === 'failed').length;
  const processing = images.filter((i) => i.status === 'processing').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{title || 'Results'}</h3>
        <div className="flex items-center gap-3 text-sm">
          {processing > 0 && (
            <span className="text-processing">{processing} processing</span>
          )}
          {completed > 0 && (
            <span className="text-success">{completed} completed</span>
          )}
          {failed > 0 && <span className="text-error">{failed} failed</span>}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((image) => (
          <ImageItem key={image.id} image={image} />
        ))}
      </div>
    </div>
  );
}
