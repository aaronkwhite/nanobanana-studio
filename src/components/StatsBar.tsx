'use client';

import { Clock, Loader2, AlertTriangle, Check, Trash2 } from 'lucide-react';

interface StatsBarProps {
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  onClear?: () => void;
}

export function StatsBar({
  pendingCount,
  processingCount,
  completedCount,
  failedCount,
  onClear,
}: StatsBarProps) {
  const totalCount = pendingCount + processingCount + completedCount + failedCount;

  if (totalCount === 0) return null;

  const hasCompletedOrFailed = completedCount > 0 || failedCount > 0;
  const hasProcessing = processingCount > 0;

  return (
    <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
      {/* Left: Status pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {pendingCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            {pendingCount} pending
          </div>
        )}
        {processingCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-processing/10 text-processing rounded-full text-xs font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            {processingCount} transforming
          </div>
        )}
        {failedCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-error/10 text-error rounded-full text-xs font-medium">
            <AlertTriangle className="w-3 h-3" />
            {failedCount} failed
          </div>
        )}
      </div>

      {/* Right: Complete count and clear button */}
      <div className="flex items-center gap-3 text-xs">
        {completedCount > 0 && (
          <span className="flex items-center gap-1.5 text-success">
            <Check className="w-3 h-3" />
            {completedCount} complete
          </span>
        )}
        {hasCompletedOrFailed && !hasProcessing && onClear && (
          <>
            <span className="text-border">|</span>
            <button
              onClick={onClear}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  );
}
