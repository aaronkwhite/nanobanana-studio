'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ArrowUp, Loader2, Maximize, RectangleHorizontal, Thermometer } from 'lucide-react';

type OutputSize = '1K' | '2K' | '4K';
type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
type Temperature = 0 | 0.5 | 1 | 1.5 | 2;

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

interface QueuedPrompt {
  id: string;
  prompt: string;
}

interface TextToImageFormProps {
  onSubmit: (data: { prompts: string[]; outputSize: OutputSize; aspectRatio: AspectRatio; temperature: Temperature }) => void;
  disabled?: boolean;
}

export function TextToImageForm({ onSubmit, disabled = false }: TextToImageFormProps) {
  const [prompt, setPrompt] = useState('');
  const [queue, setQueue] = useState<QueuedPrompt[]>([]);
  const [outputSize, setOutputSize] = useState<OutputSize>('1K');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [temperature, setTemperature] = useState<Temperature>(1);
  const [activeMenu, setActiveMenu] = useState<'size' | 'aspect' | 'temp' | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [prompt]);

  const addToQueue = () => {
    if (prompt.trim()) {
      setQueue([...queue, { id: crypto.randomUUID(), prompt: prompt.trim() }]);
      setPrompt('');
    }
  };

  const removeFromQueue = (id: string) => {
    setQueue(queue.filter((item) => item.id !== id));
  };

  const handleSubmit = () => {
    // If there's text in the input, add it first
    const finalQueue = prompt.trim()
      ? [...queue, { id: crypto.randomUUID(), prompt: prompt.trim() }]
      : queue;

    if (finalQueue.length > 0) {
      onSubmit({ prompts: finalQueue.map((item) => item.prompt), outputSize, aspectRatio, temperature });
      setQueue([]);
      setPrompt('');
    }
  };

  const closeMenus = () => setActiveMenu(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      // Shift+Enter submits
      e.preventDefault();
      handleSubmit();
    }
    // Plain Enter allows normal newline behavior
  };

  const canSubmit = prompt.trim() || queue.length > 0;

  return (
    <div className="space-y-3">
      {/* Queue */}
      {queue.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Queue ({queue.length})</span>
            <button
              onClick={() => setQueue([])}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm group"
              >
                <span className="max-w-[200px] truncate">{item.prompt}</span>
                <button
                  onClick={() => removeFromQueue(item.id)}
                  className="text-primary/60 hover:text-primary transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input card */}
      <div className="bg-muted/50 border border-border rounded-xl shadow-md">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the image you want to generate..."
          disabled={disabled}
          rows={3}
          className="w-full px-4 pt-4 pb-2 bg-transparent resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-foreground placeholder:text-placeholder"
        />

        {/* Bottom bar */}
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
            {disabled ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowUp className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
