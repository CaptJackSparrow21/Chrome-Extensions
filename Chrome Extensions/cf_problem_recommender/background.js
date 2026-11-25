const API_BASE = "https://codeforces.com/api/";
const MIN_INTERVAL_MS = 2100;
let lastRequestAt = 0;

async function callApi(method, params = {}) {
  const delay = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
  lastRequestAt = Date.now();

  const url = new URL(method, API_BASE);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`Codeforces API HTTP ${response.status}`);
  const data = await response.json();
  if (data.status !== "OK") throw new Error(data.comment || "Codeforces API request failed");
  return data.result;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "CFPR_API") return;
  callApi(message.method, message.params || {})
    .then(result => sendResponse({ ok: true, result }))
    .catch(error => sendResponse({ ok: false, error: error.message }));
  return true;
});
