'use client';

import { useState, useEffect } from 'react';
import { X, Settings, Key, Info, Loader2, Eye, EyeOff, ExternalLink, PencilLine, Coffee } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApiKeyChange?: (hasKey: boolean) => void;
}

type Tab = 'api' | 'about' | 'support';

export function SettingsModal({ isOpen, onClose, onApiKeyChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('api');

  // API Key state
  const [apiKey, setApiKey] = useState('');
  const [masked, setMasked] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkKey();
    }
  }, [isOpen]);

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
      onApiKeyChange?.(true);
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
      onApiKeyChange?.(false);
    } catch {
      setError('Failed to remove API key');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-card border border-border rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'api'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Key className="w-4 h-4" />
            API Key
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'about'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Info className="w-4 h-4" />
            About
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'support'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Coffee className="w-4 h-4" />
            Support
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'api' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking API key...</span>
                </div>
              ) : hasKey && !editing ? (
                <div className="flex items-center gap-3">
                  <code className="px-4 py-1.5 bg-muted rounded text-sm font-mono">
                    <span className="text-muted-foreground">GEMINI_API_KEY=</span>{masked}
                  </code>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      onClick={() => setEditing(true)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                      title="Change API key"
                    >
                      <PencilLine className="w-4 h-4" />
                    </button>
                    <button
                      onClick={removeKey}
                      disabled={saving}
                      className="p-2 text-muted-foreground hover:text-error hover:bg-error/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove API key"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
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
                        autoComplete="off"
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
                  {error && <p className="text-sm text-error">{error}</p>}
                </div>
              )}

              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  Enter your API key above, or set <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">GEMINI_API_KEY</code> in your shell environment.
                </p>
                <p>
                  Get your API key from{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Google AI Studio
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-4">

              <div className="space-y-3 text-sm">
                <p>
                  A lightweight, self-hosted image generation client for Google&apos;s Gemini 3 (Nano Banana) image generation Batch API.
                  BYOK (Bring Your Own Key) - your API key stays on your machine.
                </p>

                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <p className="font-medium">Features:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Text-to-Image: Generate images from prompts</li>
                    <li>Image-to-Image: Transform existing images</li>
                    <li>1K, 2K, and 4K output resolutions</li>
                    <li>Multiple aspect ratios</li>
                  </ul>
                  <p className="font-medium">API &amp; Model:</p>
                  <p className="text-muted-foreground">
                    Gemini 3 Pro Image (<code className="text-xs bg-background px-1 py-0.5 rounded">gemini-3-pro-image-preview</code>)
                  </p>
                  <p className="text-muted-foreground">
                    Uses the Batch API for async processing at 50% cost.
                  </p>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                  <p className="font-medium">Documentation:</p>
                  <div className="flex flex-col gap-1">
                    <a
                      href="https://ai.google.dev/gemini-api/docs/image-generation"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Image Generation Guide
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://ai.google.dev/gemini-api/docs/batch-api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Batch API Documentation
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://ai.google.dev/gemini-api/docs/pricing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Pricing Details
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                <p>Made with Next.js, Tailwind CSS, and SQLite</p>
              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="space-y-4 text-center">
              <img
                src="/bmc_qr.png"
                alt="Buy Me a Coffee QR Code"
                className="w-32 h-32 mx-auto rounded-lg"
              />
              <div>
                <h3 className="text-lg font-medium">Support this project</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  If you find Nanobanana Batch API Image Generator useful,<br />consider buying me a coffee!
                </p>
              </div>
              <a
                href="https://buymeacoffee.com/aaronkwhite"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#FFDD00] text-black font-medium rounded-lg hover:bg-[#FFDD00]/90 transition-colors"
              >
                <Coffee className="w-5 h-5" />
                Buy me a coffee
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
