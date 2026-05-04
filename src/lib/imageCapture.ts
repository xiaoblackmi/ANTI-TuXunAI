export async function captureCurrentTab(): Promise<string> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.windowId) {
    throw new Error("没有找到当前活动标签页。");
  }

  return chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
}
