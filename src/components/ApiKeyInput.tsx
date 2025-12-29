'use client';

import { useState, useEffect } from 'react';
import { Key, Check, X, Loader2, Eye, EyeOff } from 'lucide-react';

export function ApiKeyInput() {
  const [apiKey, setApiKey] = useState('');
  const [masked, setMasked] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    checkKey();
  }, []);

  const checkKey = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      setHasKey(data.hasKey);
      setMasked(data.masked);
    } catch {
      setError('Failed to check API key status');
    } finally {
      setLoading(false);
    }
  };

  const saveKey = async () => {
    if (!apiKey.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save API key');
        return;
      }

      setHasKey(true);
      setMasked(apiKey.slice(0, 4) + '...' + apiKey.slice(-4));
      setApiKey('');
      setEditing(false);
    } catch {
      setError('Failed to save API key');
    } finally {
      setSaving(false);
    }
  };

  const removeKey = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/config', { method: 'DELETE' });

      if (!res.ok) {
        setError('Failed to remove API key');
        return;
      }

      setHasKey(false);
      setMasked(null);
      setEditing(false);
    } catch {
      setError('Failed to remove API key');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Checking API key...</span>
      </div>
    );
  }

  if (hasKey && !editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-success/10 text-success rounded-lg">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">API Key Configured</span>
          </div>
          <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
            {masked}
          </code>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 text-sm bg-muted hover:bg-border rounded-lg transition-colors"
          >
            Change Key
          </button>
          <button
            onClick={removeKey}
            disabled={saving}
            className="px-3 py-1.5 text-sm text-error hover:bg-error/10 rounded-lg transition-colors"
          >
            {saving ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setError(null);
            }}
            placeholder="Enter your Gemini API key"
            className="w-full pl-10 pr-10 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button
          onClick={saveKey}
          disabled={!apiKey.trim() || saving}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
        </button>
        {editing && (
          <button
            onClick={() => {
              setEditing(false);
              setApiKey('');
              setError(null);
            }}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Get your API key from{' '}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Google AI Studio
        </a>
      </p>
    </div>
  );
}
