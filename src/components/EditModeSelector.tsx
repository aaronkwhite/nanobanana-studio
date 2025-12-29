'use client';

import { Palette, ImageOff, Sparkles } from 'lucide-react';

type EditMode = 'style' | 'bgswap' | 'default';

interface EditModeSelectorProps {
  editMode: EditMode;
  onEditModeChange: (mode: EditMode) => void;
}

const modes = [
  {
    id: 'default' as EditMode,
    label: 'General',
    description: 'Transform based on prompt',
    icon: Sparkles,
  },
  {
    id: 'style' as EditMode,
    label: 'Style Transfer',
    description: 'Apply artistic styles',
    icon: Palette,
  },
  {
    id: 'bgswap' as EditMode,
    label: 'Background Swap',
    description: 'Replace background',
    icon: ImageOff,
  },
];

export function EditModeSelector({ editMode, onEditModeChange }: EditModeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Edit Mode</label>
      <div className="grid grid-cols-3 gap-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = editMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onEditModeChange(mode.id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                isSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50 hover:bg-muted'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{mode.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
