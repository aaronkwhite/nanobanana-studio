'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ModeSelector } from '@/components/ModeSelector';
import { TextToImageForm } from '@/components/TextToImageForm';
import { ImageToImageForm } from '@/components/ImageToImageForm';
import { ImageGrid, type ImageResult } from '@/components/ImageGrid';
import { SettingsModal } from '@/components/SettingsModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Settings, AlertCircle, Banana, Loader2, X, RotateCcw, Maximize, Thermometer, Copy, Check, Coffee } from 'lucide-react';

type Mode = 'text-to-image' | 'image-to-image';
type OutputSize = '1K' | '2K' | '4K';
type Temperature = 0 | 0.5 | 1 | 1.5 | 2;
type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

interface Job {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  mode: Mode;
  prompt: string;
  output_size: OutputSize;
  temperature: Temperature;
  aspect_ratio: AspectRatio;
  total_items: number;
  completed_items: number;
  failed_items: number;
  created_at: string;
}

interface JobItem {
  id: string;
  job_id: string;
  input_prompt: string | null;
  input_image_path: string | null;
  output_image_path: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error: string | null;
}

// Completed job card with copy functionality
function CompletedJobCard({
  job,
  items,
  onClear,
}: {
  job: Job;
  items: ImageResult[];
  onClear: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const completedItems = items.filter((item) => item.status === 'completed' && item.outputImagePath);

  useEffect(() => {
    const node = scrollContainerRef.current;
    if (!node) return;

    const checkScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = node;
      setCanScrollLeft(scrollLeft > 1);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    };

    checkScroll();
    node.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      node.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [completedItems.length]);

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(job.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const itemCount = job.total_items || completedItems.length;
  const unitCost = job.output_size === '4K' ? 0.12 : job.output_size === '2K' ? 0.07 : 0.02;
  const totalCost = unitCost * itemCount;

  return (
    <div className="p-4 bg-card border border-border rounded-lg">
      <div className="flex items-center gap-3">
        {/* Thumbnails - horizontal scroll for multiple */}
        <div className="relative flex-shrink-0 max-w-[180px]">
          <div ref={scrollContainerRef} className="flex gap-2 overflow-x-auto scrollbar-hide">
            {completedItems.map((item) => (
            <a
              key={item.id}
              href={`/api/download/${item.outputImagePath?.split('/').pop()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted group flex-shrink-0"
            >
              <img
                src={`/api/download/${item.outputImagePath?.split('/').pop()}`}
                alt={item.inputPrompt || 'Generated image'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize className="w-5 h-5 text-white" />
              </div>
            </a>
          ))}
          </div>
          {/* Fade shadows based on scroll position */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-card to-transparent pointer-events-none" />
          )}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-card to-transparent pointer-events-none" />
          )}
        </div>
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-base text-foreground truncate">
            &quot;{job.prompt}&quot;
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            {job.output_size}
            {job.aspect_ratio && job.aspect_ratio !== '1:1' && (
              <>
                <span>·</span>
                <span>{job.aspect_ratio}</span>
              </>
            )}
            <span>·</span>
            <Thermometer className="w-3 h-3" />
            <span>{job.temperature ?? 1}</span>
            {itemCount > 1 && (
              <>
                <span>·</span>
                <span>{itemCount} imgs</span>
              </>
            )}
            <span>·</span>
            <span>~${totalCost.toFixed(2)}</span>
          </p>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={copyPrompt}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title="Copy prompt"
          >
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={onClear}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title="Remove"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nanobanana-mode');
      if (saved === 'text-to-image' || saved === 'image-to-image') {
        return saved;
      }
    }
    return 'text-to-image';
  });
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Text-to-Image state - support multiple jobs
  const [t2iJobs, setT2iJobs] = useState<Map<string, { job: Job; items: ImageResult[] }>>(new Map());

  // Image-to-Image state - support multiple jobs
  const [i2iJobs, setI2iJobs] = useState<Map<string, { job: Job; items: ImageResult[] }>>(new Map());

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Persist mode to localStorage
  useEffect(() => {
    localStorage.setItem('nanobanana-mode', mode);
  }, [mode]);

  // Check API key status and load all jobs on mount
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setHasApiKey(data.hasKey))
      .catch(() => setHasApiKey(false));

    // Load all jobs from database
    fetch('/api/jobs?status=all')
      .then((res) => res.json())
      .then((data) => {
        if (data.jobs && Array.isArray(data.jobs)) {
          const t2iMap = new Map<string, { job: Job; items: ImageResult[] }>();
          const i2iMap = new Map<string, { job: Job; items: ImageResult[] }>();

          // Load T2I jobs (exclude cancelled)
          Promise.all(
            data.jobs
              .filter((j: Job) => j.mode === 'text-to-image' && j.status !== 'cancelled')
              .map(async (job: Job) => {
                const itemsRes = await fetch(`/api/jobs/${job.id}`);
                const itemsData = await itemsRes.json();
                return { job, items: itemsData.items || [] };
              })
          ).then((results) => {
            results.forEach(({ job, items }) => {
              t2iMap.set(job.id, {
                job,
                items: items.map((item: JobItem) => ({
                  id: item.id,
                  status: item.status,
                  inputPrompt: item.input_prompt,
                  outputImagePath: item.output_image_path,
                  error: item.error,
                })),
              });
            });
            setT2iJobs(new Map(t2iMap));
          });

          // Load I2I jobs (exclude cancelled)
          Promise.all(
            data.jobs
              .filter((j: Job) => j.mode === 'image-to-image' && j.status !== 'cancelled')
              .map(async (job: Job) => {
                const itemsRes = await fetch(`/api/jobs/${job.id}`);
                const itemsData = await itemsRes.json();
                return { job, items: itemsData.items || [] };
              })
          ).then((results) => {
            results.forEach(({ job, items }) => {
              i2iMap.set(job.id, {
                job,
                items: items.map((item: JobItem) => ({
                  id: item.id,
                  status: item.status,
                  inputPrompt: item.input_prompt,
                  outputImagePath: item.output_image_path,
                  error: item.error,
                })),
              });
            });
            setI2iJobs(new Map(i2iMap));
          });
        }
      })
      .catch(() => {
        // No jobs or endpoint not available
      });
  }, []);

  // Poll for T2I job updates - poll all active jobs
  useEffect(() => {
    const activeJobs = Array.from(t2iJobs.values()).filter(
      ({ job }) => job.status === 'pending' || job.status === 'processing'
    );

    if (activeJobs.length === 0) {
      return;
    }

    const interval = setInterval(async () => {
      for (const { job } of activeJobs) {
        try {
          const res = await fetch(`/api/jobs/${job.id}`);
          if (res.ok) {
            const data = await res.json();
            setT2iJobs((prev) => {
              const newMap = new Map(prev);
              newMap.set(job.id, {
                job: data.job,
                items: data.items.map((item: JobItem) => ({
                  id: item.id,
                  status: item.status,
                  inputPrompt: item.input_prompt,
                  outputImagePath: item.output_image_path,
                  error: item.error,
                })),
              });
              return newMap;
            });
          }
        } catch {
          // Ignore polling errors
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [t2iJobs]);

  // Poll for I2I job updates - poll all active jobs
  useEffect(() => {
    const activeJobs = Array.from(i2iJobs.values()).filter(
      ({ job }) => job.status === 'pending' || job.status === 'processing'
    );

    if (activeJobs.length === 0) {
      return;
    }

    const interval = setInterval(async () => {
      for (const { job } of activeJobs) {
        try {
          const res = await fetch(`/api/jobs/${job.id}`);
          if (res.ok) {
            const data = await res.json();
            setI2iJobs((prev) => {
              const newMap = new Map(prev);
              newMap.set(job.id, {
                job: data.job,
                items: data.items.map((item: JobItem) => ({
                  id: item.id,
                  status: item.status,
                  inputPrompt: item.input_prompt,
                  outputImagePath: item.output_image_path,
                  error: item.error,
                })),
              });
              return newMap;
            });
          }
        } catch {
          // Ignore polling errors
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [i2iJobs]);

  const handleTextToImageSubmit = useCallback(
    async (data: { prompts: string[]; outputSize: OutputSize; aspectRatio: string; temperature: Temperature }) => {
      try {
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'text-to-image',
            prompts: data.prompts,
            outputSize: data.outputSize,
            temperature: data.temperature,
            aspectRatio: data.aspectRatio,
          }),
        });

        const responseData = await res.json();

        if (res.ok) {
          const { job, items } = responseData;
          setT2iJobs((prev) => {
            const newMap = new Map(prev);
            newMap.set(job.id, {
              job,
              items: items.map((item: JobItem) => ({
                id: item.id,
                status: item.status,
                inputPrompt: item.input_prompt,
                outputImagePath: item.output_image_path,
                error: item.error,
              })),
            });
            return newMap;
          });
        } else {
          setError(responseData.error || 'Failed to create job');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to server');
      }
    },
    []
  );

  const handleImageToImageSubmit = useCallback(
    async (data: {
      prompt: string;
      files: { id: string; path: string; name: string }[];
      outputSize: OutputSize;
      temperature: Temperature;
      aspectRatio: AspectRatio;
    }) => {
      try {
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'image-to-image',
            prompt: data.prompt,
            imagePaths: data.files.map((f) => f.path),
            outputSize: data.outputSize,
            temperature: data.temperature,
            aspectRatio: data.aspectRatio,
          }),
        });

        const responseData = await res.json();

        if (res.ok) {
          const { job, items } = responseData;
          setI2iJobs((prev) => {
            const newMap = new Map(prev);
            newMap.set(job.id, {
              job,
              items: items.map((item: JobItem) => ({
                id: item.id,
                status: item.status,
                inputPrompt: item.input_prompt,
                outputImagePath: item.output_image_path,
                error: item.error,
              })),
            });
            return newMap;
          });
        } else {
          setError(responseData.error || 'Failed to create job');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to server');
      }
    },
    []
  );

  const clearT2iJob = useCallback(async (jobId: string) => {
    // Delete from DB
    try {
      await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
    } catch {}
    // Remove from local state
    setT2iJobs((prev) => {
      const newMap = new Map(prev);
      newMap.delete(jobId);
      return newMap;
    });
  }, []);

  const clearAllT2iJobs = useCallback(async () => {
    // Delete all from DB
    const jobs = Array.from(t2iJobs.keys());
    await Promise.all(jobs.map(id => fetch(`/api/jobs/${id}`, { method: 'DELETE' }).catch(() => {})));
    setT2iJobs(new Map());
  }, [t2iJobs]);

  const clearI2iJob = useCallback(async (jobId: string) => {
    // Delete from DB
    try {
      await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
    } catch {}
    // Remove from local state
    setI2iJobs((prev) => {
      const newMap = new Map(prev);
      newMap.delete(jobId);
      return newMap;
    });
  }, []);

  const clearAllI2iJobs = useCallback(async () => {
    // Delete all from DB
    const jobs = Array.from(i2iJobs.keys());
    await Promise.all(jobs.map(id => fetch(`/api/jobs/${id}`, { method: 'DELETE' }).catch(() => {})));
    setI2iJobs(new Map());
  }, [i2iJobs]);

  const cancelJob = useCallback(async (jobId: string, mode: 'text-to-image' | 'image-to-image') => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      if (res.ok) {
        // Remove from local state
        if (mode === 'text-to-image') {
          clearT2iJob(jobId);
        } else {
          clearI2iJob(jobId);
        }
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to cancel job');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel job');
    }
  }, [clearT2iJob, clearI2iJob]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Banana className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Nanobanana</h1>
            <p className="text-sm text-muted-foreground">Batch API Image Generator</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 text-muted-foreground hover:text-foreground bg-muted hover:bg-border rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-error/10 border border-error/20 rounded-lg animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
          <p className="flex-1 text-sm text-error">{error}</p>
          <button
            onClick={() => setError(null)}
            className="p-1 text-error/60 hover:text-error transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* API Key Warning */}
      {!hasApiKey && hasApiKey !== null && (
        <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">API Key Required</p>
            <p className="text-xs text-muted-foreground">
              Configure your Gemini API key in settings to start generating images.
            </p>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-3 py-1.5 text-sm bg-warning/20 hover:bg-warning/30 text-warning rounded-lg transition-colors"
          >
            Configure
          </button>
        </div>
      )}

      {/* Mode Selector */}
      <ModeSelector mode={mode} onModeChange={setMode} />

      {/* Form based on mode */}
      {mode === 'text-to-image' ? (
        <div className="space-y-6">
          {/* Instructions */}
          <div className="text-sm text-muted-foreground">
            <p>Describe the image you want and press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Shift</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> to generate. Batch API processes asynchronously at 50% reduced cost.</p>
          </div>

          <TextToImageForm
            onSubmit={handleTextToImageSubmit}
            disabled={!hasApiKey}
          />

          {/* T2I Jobs Header */}
          {t2iJobs.size > 0 && (() => {
            const jobs = Array.from(t2iJobs.values()).filter(({ job }) => job);
            if (jobs.length === 0) return null;
            const completedCount = jobs.filter(({ job }) => job.status === 'completed').length;
            const processingCount = jobs.filter(({ job }) => job.status === 'processing' || job.status === 'pending').length;
            const failedCount = jobs.filter(({ job }) => job.status === 'failed').length;
            const totalCost = jobs
              .filter(({ job }) => job.status === 'completed')
              .reduce((sum, { job }) => {
                const unitCost = job.output_size === '4K' ? 0.12 : job.output_size === '2K' ? 0.07 : 0.02;
                return sum + (unitCost * (job.total_items || 1));
              }, 0);

            return (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-foreground font-medium">{t2iJobs.size} generation{t2iJobs.size !== 1 ? 's' : ''}</span>
                  <span className="text-muted-foreground">·</span>
                  {processingCount > 0 && (
                    <>
                      <span className="flex items-center gap-1.5 text-processing">
                        <span className="w-1.5 h-1.5 bg-processing rounded-full animate-pulse" />
                        {processingCount} processing
                      </span>
                      <span className="text-muted-foreground">·</span>
                    </>
                  )}
                  {completedCount > 0 && (
                    <span className="text-muted-foreground">{completedCount} complete</span>
                  )}
                  {failedCount > 0 && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-error">{failedCount} failed</span>
                    </>
                  )}
                  {totalCost > 0 && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">~${totalCost.toFixed(2)}</span>
                    </>
                  )}
                </div>
                <button
                  onClick={clearAllT2iJobs}
                  className="px-2.5 py-1 text-sm text-muted-foreground hover:text-foreground bg-muted hover:bg-border rounded-lg transition-colors"
                >
                  Clear all
                </button>
              </div>
            );
          })()}
          {Array.from(t2iJobs.values())
            .filter(({ job }) => job)
            .sort((a, b) => new Date(b.job.created_at).getTime() - new Date(a.job.created_at).getTime())
            .map(({ job, items }) => (
              <div key={job.id}>
                {job.status === 'pending' && (
                  <div className="p-4 bg-card border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      {/* Skeleton thumbnail */}
                      <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-foreground truncate">
                          &quot;{job.prompt}&quot;
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">Starting...</p>
                      </div>
                      {/* Cancel button */}
                      <button
                        onClick={() => cancelJob(job.id, 'text-to-image')}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {job.status === 'processing' && (
                  <div className="p-4 bg-card border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      {/* Skeleton thumbnail with shimmer */}
                      <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent animate-shimmer" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      </div>
                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-foreground truncate">
                          &quot;{job.prompt}&quot;
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Generating{job.total_items > 1 ? ` ${job.total_items} images` : ''}...
                        </p>
                      </div>
                      {/* Cancel button */}
                      <button
                        onClick={() => cancelJob(job.id, 'text-to-image')}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {job.status === 'completed' && items.length > 0 && (
                  <CompletedJobCard
                    job={job}
                    items={items}
                    onClear={() => clearT2iJob(job.id)}
                  />
                )}

                {job.status === 'failed' && (
                  <div className="p-4 bg-card border border-error/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      {/* Error thumbnail */}
                      <div className="w-14 h-14 rounded-lg bg-error/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-error" />
                      </div>
                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-foreground truncate">
                          &quot;{job.prompt}&quot;
                        </p>
                        <p className="text-xs text-error mt-0.5 truncate">
                          {job.total_items > 1
                            ? `${job.failed_items}/${job.total_items} failed`
                            : items.find(i => i.error)?.error || 'Generation failed'}
                        </p>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => clearT2iJob(job.id)}
                          className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors"
                          title="Retry"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => clearT2iJob(job.id)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Upload multiple images and describe how to transform them. Try prompts like:</p>
            <p className="text-xs">Style transfer (watercolor, oil painting, anime) • Background changes • Color adjustments • Add or remove objects • Upscale and enhance</p>
            <p className="text-xs">Batch API processes asynchronously at 50% reduced cost.</p>
          </div>

          <ImageToImageForm
            onSubmit={handleImageToImageSubmit}
            disabled={!hasApiKey}
          />

          {/* I2I Jobs Header */}
          {i2iJobs.size > 0 && (() => {
            const jobs = Array.from(i2iJobs.values()).filter(({ job }) => job);
            if (jobs.length === 0) return null;
            const completedCount = jobs.filter(({ job }) => job.status === 'completed').length;
            const processingCount = jobs.filter(({ job }) => job.status === 'processing' || job.status === 'pending').length;
            const failedCount = jobs.filter(({ job }) => job.status === 'failed').length;
            const totalCost = jobs
              .filter(({ job }) => job.status === 'completed')
              .reduce((sum, { job }) => {
                const unitCost = job.output_size === '4K' ? 0.12 : job.output_size === '2K' ? 0.07 : 0.02;
                return sum + (unitCost * (job.total_items || 1));
              }, 0);

            return (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-foreground font-medium">{i2iJobs.size} transformation{i2iJobs.size !== 1 ? 's' : ''}</span>
                  <span className="text-muted-foreground">·</span>
                  {processingCount > 0 && (
                    <>
                      <span className="flex items-center gap-1.5 text-processing">
                        <span className="w-1.5 h-1.5 bg-processing rounded-full animate-pulse" />
                        {processingCount} processing
                      </span>
                      <span className="text-muted-foreground">·</span>
                    </>
                  )}
                  {completedCount > 0 && (
                    <span className="text-muted-foreground">{completedCount} complete</span>
                  )}
                  {failedCount > 0 && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-error">{failedCount} failed</span>
                    </>
                  )}
                  {totalCost > 0 && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">~${totalCost.toFixed(2)}</span>
                    </>
                  )}
                </div>
                <button
                  onClick={clearAllI2iJobs}
                  className="px-2.5 py-1 text-sm text-muted-foreground hover:text-foreground bg-muted hover:bg-border rounded-lg transition-colors"
                >
                  Clear all
                </button>
              </div>
            );
          })()}

          {/* I2I Job Cards */}
          {Array.from(i2iJobs.values())
            .filter(({ job }) => job)
            .sort((a, b) => new Date(b.job.created_at).getTime() - new Date(a.job.created_at).getTime())
            .map(({ job, items }) => (
              <div key={job.id}>
                {job.status === 'pending' && (
                  <div className="p-4 bg-card border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-foreground truncate">
                          &quot;{job.prompt}&quot;
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">Starting...</p>
                      </div>
                      {/* Cancel button */}
                      <button
                        onClick={() => cancelJob(job.id, 'image-to-image')}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {job.status === 'processing' && (
                  <div className="p-4 bg-card border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent animate-shimmer" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-foreground truncate">
                          &quot;{job.prompt}&quot;
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Transforming{job.total_items > 1 ? ` ${job.total_items} images` : ''}...
                        </p>
                      </div>
                      {/* Cancel button */}
                      <button
                        onClick={() => cancelJob(job.id, 'image-to-image')}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {job.status === 'completed' && items.length > 0 && (
                  <CompletedJobCard
                    job={job}
                    items={items}
                    onClear={() => clearI2iJob(job.id)}
                  />
                )}

                {job.status === 'failed' && (
                  <div className="p-4 bg-card border border-error/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-error/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-error" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-foreground truncate">
                          &quot;{job.prompt}&quot;
                        </p>
                        <p className="text-xs text-error mt-0.5 truncate">
                          {job.total_items > 1
                            ? `${job.failed_items}/${job.total_items} failed`
                            : items.find(i => i.error)?.error || 'Transformation failed'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => clearI2iJob(job.id)}
                          className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors"
                          title="Retry"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => clearI2iJob(job.id)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

        </div>
      )}

      {/* API info footer */}
      <div className="text-xs text-muted-foreground text-center space-y-0.5 pt-4">
        <p>
          <code className="bg-muted px-1.5 py-0.5 rounded">gemini-3-pro-image-preview</code>
        </p>
        <p>Batch API • 50% reduced cost</p>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onApiKeyChange={setHasApiKey}
      />

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-border">
        <div className="flex items-center justify-center">
          <a
            href="https://buymeacoffee.com/aaronkwhite"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Coffee className="w-4 h-4" />
            Buy me a coffee
          </a>
        </div>
      </footer>
    </div>
  );
}
