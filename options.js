const form = document.getElementById("settings-form");
const input = document.getElementById("api-key");
const model = document.getElementById("model");
const status = document.getElementById("status");

document.getElementById("toggle-key").addEventListener("click", (event) => {
  input.type = input.type === "password" ? "text" : "password";
  event.currentTarget.textContent = input.type === "password" ? "Show" : "Hide";
});

chrome.storage.local.get(["openRouterApiKey", "openRouterModel"]).then(({ openRouterApiKey, openRouterModel }) => {
  if (openRouterApiKey) input.value = openRouterApiKey;
  if (openRouterModel) model.value = openRouterModel;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await chrome.storage.local.set({
    openRouterApiKey: input.value.trim(),
    openRouterModel: model.value.trim()
  });
  status.textContent = "Saved";
  window.setTimeout(() => { status.textContent = ""; }, 2200);
});
