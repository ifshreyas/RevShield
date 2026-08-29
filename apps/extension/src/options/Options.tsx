import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export const Options: React.FC = () => {
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [blockAds, setBlockAds] = useState(true);
  const [blockTrackers, setBlockTrackers] = useState(true);
  const [badgeCounter, setBadgeCounter] = useState(true);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(
        ['whitelistedDomains', 'blockAds', 'blockTrackers', 'badgeCounter'],
        (data) => {
          if (data.whitelistedDomains) setWhitelist(data.whitelistedDomains);
          if (data.blockAds !== undefined) setBlockAds(data.blockAds);
          if (data.blockTrackers !== undefined) setBlockTrackers(data.blockTrackers);
          if (data.badgeCounter !== undefined) setBadgeCounter(data.badgeCounter);
        }
      );
    }
  }, []);

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    const d = newDomain.toLowerCase().trim().replace(/^https?:\/\//, '').split('/')[0];
    if (!d || whitelist.includes(d)) return;

    const updated = [...whitelist, d];
    setWhitelist(updated);
    setNewDomain('');

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ whitelistedDomains: updated });
    }
  };

  const handleRemoveDomain = (domain: string) => {
    const updated = whitelist.filter((item) => item !== domain);
    setWhitelist(updated);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ whitelistedDomains: updated });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8 font-sans">
      {/* Header */}
      <div className="flex items-center space-x-3 border-b border-border pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-subtle text-accent">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">RevShield Extension Settings</h1>
          <p className="text-xs text-text-secondary">Configure local protection rules and custom domain whitelists.</p>
        </div>
      </div>

      {/* Whitelist Management */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-text-primary uppercase font-mono tracking-wider">
          Domain Whitelist ({whitelist.length})
        </h2>
        <p className="text-xs text-text-secondary leading-relaxed">
          Whitelisted domains will not be blocked by DeclarativeNetRequest rules.
        </p>

        <form onSubmit={handleAddDomain} className="flex gap-2">
          <input
            type="text"
            placeholder="example.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newDomain.trim()}
            className="rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add</span>
          </button>
        </form>

        <div className="space-y-2 max-h-60 overflow-y-auto pt-2">
          {whitelist.map((domain) => (
            <div
              key={domain}
              className="flex items-center justify-between rounded-lg border border-border bg-surface-elevated p-2.5 text-xs font-mono"
            >
              <span className="text-text-primary">{domain}</span>
              <button
                onClick={() => handleRemoveDomain(domain)}
                className="text-text-muted hover:text-shield-danger transition-colors p-1"
                title="Remove from whitelist"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
