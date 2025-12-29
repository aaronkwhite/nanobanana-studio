'use client';

type OutputSize = '1K' | '2K' | '4K';
type Temperature = 0 | 0.5 | 1 | 1.5 | 2;

const TEMPERATURES: Temperature[] = [0, 0.5, 1, 1.5, 2];

interface OutputSettingsProps {
  outputSize: OutputSize;
  onOutputSizeChange: (size: OutputSize) => void;
  temperature?: Temperature;
  onTemperatureChange?: (temp: Temperature) => void;
}

export function OutputSettings({
  outputSize,
  onOutputSizeChange,
  temperature = 1,
  onTemperatureChange,
}: OutputSettingsProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Size:</label>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => onOutputSizeChange('1K')}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
              outputSize === '1K'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted'
            }`}
          >
            1K
          </button>
          <button
            onClick={() => onOutputSizeChange('2K')}
            className={`px-4 py-1.5 text-sm font-medium border-l border-border transition-colors ${
              outputSize === '2K'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted'
            }`}
          >
            2K
          </button>
          <button
            onClick={() => onOutputSizeChange('4K')}
            className={`px-4 py-1.5 text-sm font-medium border-l border-border transition-colors ${
              outputSize === '4K'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted'
            }`}
          >
            4K
          </button>
        </div>
      </div>

      {onTemperatureChange && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Temp:</label>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {TEMPERATURES.map((temp, idx) => (
              <button
                key={temp}
                onClick={() => onTemperatureChange(temp)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  idx > 0 ? 'border-l border-border' : ''
                } ${
                  temperature === temp
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted'
                }`}
              >
                {temp}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
