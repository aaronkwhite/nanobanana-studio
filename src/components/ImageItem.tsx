'use client';

import { Download, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import type { ImageResult } from './ImageGrid';

interface ImageItemProps {
  image: ImageResult;
}

export function ImageItem({ image }: ImageItemProps) {
  const getFilename = (path: string) => path.split('/').pop() || 'image.png';

  return (
    <div className="relative aspect-square bg-card border border-border rounded-lg overflow-hidden group">
      {/* Content based on status */}
      {image.status === 'completed' && image.outputImagePath ? (
        <>
          <img
            src={`/api/download/${getFilename(image.outputImagePath)}`}
            alt="Generated image"
            className="w-full h-full object-cover"
          />
          {/* Download button overlay */}
          <a
            href={`/api/download/${getFilename(image.outputImagePath)}`}
            download
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="p-2 bg-white rounded-full">
              <Download className="w-5 h-5 text-black" />
            </div>
          </a>
        </>
      ) : image.status === 'processing' ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-processing">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs">Generating...</span>
        </div>
      ) : image.status === 'failed' ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3 text-error">
          <AlertCircle className="w-8 h-8" />
          <span className="text-xs text-center line-clamp-2">{image.error || 'Failed'}</span>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <ImageIcon className="w-8 h-8" />
          <span className="text-xs">Pending</span>
        </div>
      )}

      {/* Prompt preview (bottom) */}
      {image.inputPrompt && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
          <p className="text-xs text-white line-clamp-2">{image.inputPrompt}</p>
        </div>
      )}
    </div>
  );
}
