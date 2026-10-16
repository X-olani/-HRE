// CABC HRE Capture — background service worker (Manifest V3)
// On toolbar click: scrape the current post URL + a text snippet, screenshot the
// visible tab (using the reviewer's own logged-in session), POST to the HRE
// Monitor /api/capture endpoint, and open the prefilled draft entry.

function scrape() {
  const pick = (sel, attr) => {
    const el = document.querySelector(sel);
    return el ? (attr ? el.getAttribute(attr) : el.textContent) : "";
  };
  const text =
    (window.getSelection && window.getSelection().toString()) ||
    pick('meta[property="og:title"]', "content") ||
    pick('meta[property="og:description"]', "content") ||
    document.title ||
    "";
  return { url: location.href, text: (text || "").trim().slice(0, 600) };
}

function badge(txt, color) {
  try {
    chrome.action.setBadgeBackgroundColor({ color: color || "#3299CC" });
    chrome.action.setBadgeText({ text: txt });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 4000);
  } catch (e) {}
}

function notify(title, message) {
  try {
    chrome.notifications.create({
      type: "basic",
      iconUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      title,
      message
    });
  } catch (e) {}
}

chrome.action.onClicked.addListener(async (tab) => {
  const cfg = await chrome.storage.sync.get(["appUrl", "token"]);
  if (!cfg.appUrl || !cfg.token) {
    chrome.runtime.openOptionsPage();
    return;
  }
  if (!tab || !tab.id) return;

  let scraped = { url: tab.url || "", text: "" };
  try {
    const res = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: scrape });
    if (res && res[0] && res[0].result) scraped = res[0].result;
  } catch (e) {
    // restricted page (e.g. chrome://) — fall back to tab.url
  }

  let dataUrl = null;
  try {
    dataUrl = await chrome.tabs.captureVisibleTab({ format: "png" });
  } catch (e) {}

  const fd = new FormData();
  fd.append("token", cfg.token);
  fd.append("url", scraped.url || tab.url || "");
  fd.append("text", scraped.text || "");
  if (dataUrl) {
    const blob = await (await fetch(dataUrl)).blob();
    fd.append("screenshot", blob, "capture.png");
  }

  const base = cfg.appUrl.replace(/\/+$/, "");
  try {
    const resp = await fetch(base + "/api/capture", { method: "POST", body: fd });
    const j = await resp.json().catch(() => ({}));
    if (resp.ok && j.editUrl) {
      badge("✓", "#2e7d32");
      chrome.tabs.create({ url: j.editUrl });
    } else {
      badge("!", "#A32D2D");
      notify("HRE capture failed", j.error || "HTTP " + resp.status);
    }
  } catch (e) {
    badge("!", "#A32D2D");
    notify("HRE capture failed", "Could not reach the app. Check the App URL in options.");
  }
});
