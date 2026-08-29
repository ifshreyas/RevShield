import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Settings, ExternalLink, RefreshCw, Eye, Zap, Info } from 'lucide-react';
import { normalizeDomain, isInternalOrBrowserUrl, isPrivateOrLocalHost } from '@webshield/shared-utils';

export const Popup: React.FC = () => {
  const [currentDomain, setCurrentDomain] = useState<string>('Detecting...');
  const [isInternal, setIsInternal] = useState<boolean>(false);
  const [isProtected, setIsProtected] = useState<boolean>(true);
  const [trackersBlocked, setTrackersBlocked] = useState<number>(0);
  const [adsBlocked, setAdsBlocked] = useState<number>(0);
  const [totalTrackers, setTotalTrackers] = useState<number>(0);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab && tab.url) {
          if (isInternalOrBrowserUrl(tab.url)) {
            setIsInternal(true);
            setCurrentDomain('Browser Internal Page');
            return;
          }

          const domain = normalizeDomain(tab.url);
          if (!domain) {
            setIsInternal(true);
            setCurrentDomain('New Tab');
            return;
          }

          if (isPrivateOrLocalHost(domain)) {
            setIsInternal(true);
            setCurrentDomain(`${domain} (Local)`);
            return;
          }

          setCurrentDomain(domain);
          setIsInternal(false);

          // Check if domain is whitelisted
          chrome.storage.local.get(['whitelistedDomains', 'totalTrackersBlocked'], (res) => {
            const list: string[] = res.whitelistedDomains || [];
            const isWhitelisted = list.includes(domain);
            setIsProtected(!isWhitelisted);
            setTotalTrackers(res.totalTrackersBlocked || 0);
          });

          // Fetch tab stats
          if (tab.id) {
            chrome.runtime.sendMessage(
              { type: 'GET_TAB_STATS', tabId: tab.id, domain },
              (response) => {
                if (response && response.stats) {
                  setTrackersBlocked(response.stats.trackersBlocked || 0);
                  setAdsBlocked(response.stats.adsBlocked || 0);
                }
              }
            );
          }
        }
      });
    }
  }, []);

  const handleToggleProtection = () => {
    if (isInternal) return;
    const nextState = !isProtected;
    setIsProtected(nextState);

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'TOGGLE_WHITELIST',
        domain: currentDomain,
        whitelisted: !nextState,
      });
    }
  };

  const handleOpenReport = () => {
    let targetUrl = 'http://localhost:5173';
    if (!isInternal && currentDomain && currentDomain !== 'Detecting...') {
      targetUrl = `http://localhost:5173/report/${encodeURIComponent(currentDomain)}`;
    }
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: targetUrl });
    } else {
      window.open(targetUrl, '_blank');
    }
  };

  const handleOpenOptions = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('/options.html', '_blank');
    }
  };

  return (
    <div className="w-[360px] bg-background text-text-primary p-4 space-y-4 font-sans select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center space-x-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface border border-border">
            <Shield className="h-4 w-4 text-accent" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">RevShield</span>
            <span className="text-[9px] uppercase font-mono tracking-widest text-text-muted -mt-1">Extension</span>
          </div>
        </div>
        <button
          onClick={handleOpenOptions}
          title="Open settings"
          className="text-text-muted hover:text-text-primary transition-colors p-1"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Current Site Card */}
      <div className="rounded-xl border border-border bg-surface p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-semibold text-text-primary truncate max-w-[200px]" title={currentDomain}>
            {currentDomain}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
              isInternal
                ? 'bg-surface-elevated text-text-muted border-border'
                : isProtected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            {isInternal ? 'INTERNAL' : isProtected ? 'PROTECTED' : 'WHITELISTED'}
          </span>
        </div>

        {isInternal ? (
          <div className="flex items-center space-x-2 py-1 text-xs text-text-muted">
            <Info className="h-3.5 w-3.5 shrink-0 text-accent" />
            <span>Local and browser pages are not scanned for SSRF safety.</span>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <span className="text-xs text-text-secondary">Protection for this site</span>
            <button
              onClick={handleToggleProtection}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isProtected ? 'bg-accent' : 'bg-surface-elevated'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isProtected ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {/* Block Counters */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-border bg-surface p-3 text-center space-y-1">
          <div className="flex items-center justify-center space-x-1 text-text-muted">
            <Eye className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase font-mono tracking-wider">Trackers</span>
          </div>
          <div className="text-xl font-bold font-mono text-text-primary">
            {trackersBlocked}
          </div>
          <div className="text-[10px] text-text-muted">blocked this tab</div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3 text-center space-y-1">
          <div className="flex items-center justify-center space-x-1 text-text-muted">
            <Zap className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase font-mono tracking-wider">Ads</span>
          </div>
          <div className="text-xl font-bold font-mono text-text-primary">
            {adsBlocked}
          </div>
          <div className="text-[10px] text-text-muted">blocked this tab</div>
        </div>
      </div>

      {/* Deep Link to WebShield Intelligence Platform */}
      <button
        onClick={handleOpenReport}
        className="w-full flex items-center justify-center space-x-2 rounded-xl bg-accent hover:bg-accent-hover text-white py-2.5 text-xs font-semibold shadow-sm transition-all"
      >
        <span>{isInternal ? 'Open RevShield Scanner' : 'View Full Intelligence Report'}</span>
        <ExternalLink className="h-3.5 w-3.5" />
      </button>

      {/* Lifetime Stats Footer */}
      <div className="text-center text-[10px] font-mono text-text-muted pt-1">
        {totalTrackers.toLocaleString()} total threats intercepted locally
      </div>
    </div>
  );
};
