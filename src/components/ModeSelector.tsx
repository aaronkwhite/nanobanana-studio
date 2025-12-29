'use client';

import { ImagePlus, Wand2 } from 'lucide-react';

type Mode = 'text-to-image' | 'image-to-image';

interface ModeSelectorProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => onModeChange('text-to-image')}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
          mode === 'text-to-image'
            ? 'bg-primary text-primary-foreground'
            : 'bg-background hover:bg-muted text-foreground'
        }`}
      >
        <ImagePlus className="w-4 h-4" />
        <span>Text to Image</span>
      </button>
      <button
        onClick={() => onModeChange('image-to-image')}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-l border-border transition-colors ${
          mode === 'image-to-image'
            ? 'bg-primary text-primary-foreground'
            : 'bg-background hover:bg-muted text-foreground'
        }`}
      >
        <Wand2 className="w-4 h-4" />
        <span>Image to Image</span>
      </button>
    </div>
  );
}
