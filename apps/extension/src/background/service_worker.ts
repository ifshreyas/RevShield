import { compileDeclarativeNetRequestRules, KNOWN_TRACKER_SIGNATURES } from '@webshield/rule-engine';

interface TabState {
  domain: string;
  adsBlocked: number;
  trackersBlocked: number;
  isWhitelisted: boolean;
}

const tabStates = new Map<number, TabState>();

// Initialize declarativeNetRequest rules
async function updateDNRRules(whitelistedDomains: string[] = []) {
  try {
    const rules = compileDeclarativeNetRequestRules(KNOWN_TRACKER_SIGNATURES, whitelistedDomains);
    // Remove existing dynamic rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map((r) => r.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: rules as any,
    });
  } catch (err) {
    console.error('[RevShield] Failed to update declarative rules:', err);
  }
}

// On install / startup
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['whitelistedDomains', 'totalAdsBlocked', 'totalTrackersBlocked']);
  const whitelist = data.whitelistedDomains || [];
  await updateDNRRules(whitelist);
});

// Update badge when rules trigger
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((info) => {
  const tabId = info.request.tabId;
  if (tabId && tabId > 0) {
    const current = tabStates.get(tabId) || {
      domain: '',
      adsBlocked: 0,
      trackersBlocked: 0,
      isWhitelisted: false,
    };

    current.trackersBlocked += 1;
    current.adsBlocked += 1;
    tabStates.set(tabId, current);

    const total = current.trackersBlocked;
    chrome.action.setBadgeText({ tabId, text: total.toString() });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#6366f1' });

    // Update global persistent counts
    chrome.storage.local.get(['totalTrackersBlocked', 'totalAdsBlocked'], (stored) => {
      chrome.storage.local.set({
        totalTrackersBlocked: (stored.totalTrackersBlocked || 0) + 1,
        totalAdsBlocked: (stored.totalAdsBlocked || 0) + 1,
      });
    });
  }
});

// Message listener for popup & options communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TAB_STATS') {
    const tabId = message.tabId;
    const stats = tabStates.get(tabId) || {
      domain: message.domain || '',
      adsBlocked: 0,
      trackersBlocked: 0,
      isWhitelisted: false,
    };
    sendResponse({ stats });
  } else if (message.type === 'TOGGLE_WHITELIST') {
    const { domain, whitelisted } = message;
    chrome.storage.local.get(['whitelistedDomains'], async (data) => {
      let list: string[] = data.whitelistedDomains || [];
      if (whitelisted) {
        if (!list.includes(domain)) list.push(domain);
      } else {
        list = list.filter((d) => d !== domain);
      }
      await chrome.storage.local.set({ whitelistedDomains: list });
      await updateDNRRules(list);
      sendResponse({ success: true, whitelistedDomains: list });
    });
    return true; // async sendResponse
  }
});
