const $ = (id) => document.getElementById(id);

chrome.storage.sync.get(["appUrl", "token"], (cfg) => {
  $("appUrl").value = cfg.appUrl || "";
  $("token").value = cfg.token || "";
});

$("save").addEventListener("click", () => {
  const appUrl = $("appUrl").value.trim().replace(/\/+$/, "");
  const token = $("token").value.trim();
  chrome.storage.sync.set({ appUrl, token }, () => {
    $("msg").textContent = "Saved. You can close this tab.";
    setTimeout(() => ($("msg").textContent = ""), 3000);
  });
});
