chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ geoAssistantInstalledAt: new Date().toISOString() });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GEO_ASSISTANT_PING") {
    sendResponse({ ok: true });
  }
  return false;
});
