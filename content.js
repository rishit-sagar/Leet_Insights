(() => {
  const BUTTON_ID = "complexity-lens-analyze";
  let lastCode = "";

  function findSubmitButton() {
    const candidates = [...document.querySelectorAll("button")];
    return candidates.find((button) => {
      const label = button.textContent?.trim().toLowerCase();
      return label === "submit" || label?.startsWith("submit");
    });
  }

  function findEditorCode() {
    const lines = document.querySelector(".monaco-editor .view-lines");
    if (lines) {
      const lineElements = [...lines.querySelectorAll(".view-line")];
      const renderedCode = (lineElements.length ? lineElements : [lines])
        .map((line) => line.textContent || "")
        .join("\n")
        .trim();
      if (renderedCode) return renderedCode;
    }

    const editor = document.querySelector("textarea.inputarea, textarea[data-testid*=editor]");
    return editor?.value?.trim() || "";
  }

  function getProblemName() {
    const heading = document.querySelector("h1, [data-cy=question-title]");
    return heading?.textContent?.trim() || document.title.replace(/ - LeetCode.*$/i, "");
  }

  function getLanguage() {
    const selectors = ["button[aria-label*=language i]", "[data-cy=lang-select]", "button[class*=language]"];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) return element.textContent.trim();
    }
    return "Unknown";
  }

  function injectButton() {
    if (document.getElementById(BUTTON_ID)) return;
    const submit = findSubmitButton();
    if (!submit?.parentElement) return;

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.className = `${submit.className} complexity-lens-button`;
    button.innerHTML = '<span class="complexity-lens-spark">✦</span><span>Analyze</span>';
    button.title = "Analyze time and space complexity";
    button.addEventListener("click", analyze);
    submit.insertAdjacentElement("afterend", button);
  }

  async function analyze() {
    const button = document.getElementById(BUTTON_ID);
    const code = findEditorCode();
    if (!code) {
      showDialog({ error: "I couldn't find code in the LeetCode editor. Click inside the editor once and try again." });
      return;
    }

    lastCode = code;
    button.disabled = true;
    button.classList.add("is-loading");
    button.querySelector("span:last-child").textContent = "Analyzing...";

    chrome.runtime.sendMessage({
      type: "ANALYZE_CODE",
      code,
      language: getLanguage(),
      problem: getProblemName()
    }, (response) => {
      button.disabled = false;
      button.classList.remove("is-loading");
      button.querySelector("span:last-child").textContent = "Analyze";
      if (chrome.runtime.lastError) return showDialog({ error: chrome.runtime.lastError.message });
      if (response?.needsKey) return showDialog({ error: response.error, needsKey: true });
      if (!response?.ok) return showDialog({ error: response?.error || "Analysis failed." });
      showDialog(response.result);
    });
  }

  function showDialog(data) {
    document.getElementById("complexity-lens-dialog")?.remove();
    const overlay = document.createElement("div");
    overlay.id = "complexity-lens-dialog";
    overlay.innerHTML = `
      <div class="complexity-lens-backdrop" data-close="true"></div>
      <section class="complexity-lens-modal" role="dialog" aria-modal="true" aria-labelledby="complexity-lens-title">
        <button class="complexity-lens-close" aria-label="Close">×</button>
        <div class="complexity-lens-kicker">COMPLEXITY LENS</div>
        <h2 id="complexity-lens-title">${data.error ? "Analysis unavailable" : "Your complexity report"}</h2>
        ${data.error ? `<p class="complexity-lens-error">${escapeHtml(data.error)}</p>${data.needsKey ? '<button class="complexity-lens-settings">Open settings</button>' : ""}` : renderResult(data)}
      </section>`;
    document.body.appendChild(overlay);
    overlay.querySelector(".complexity-lens-close").addEventListener("click", () => overlay.remove());
    overlay.querySelector("[data-close]").addEventListener("click", () => overlay.remove());
    overlay.querySelector(".complexity-lens-settings")?.addEventListener("click", () => chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" }));
    document.addEventListener("keydown", closeOnEscape, { once: true });

    function closeOnEscape(event) {
      if (event.key === "Escape") overlay.remove();
    }
  }

  function renderResult(data) {
    return `<div class="complexity-lens-metrics">
      <div class="complexity-lens-metric"><span>TIME</span><strong>${escapeHtml(data.timeComplexity || "Not determined")}</strong></div>
      <div class="complexity-lens-metric"><span>SPACE</span><strong>${escapeHtml(data.spaceComplexity || "Not determined")}</strong></div>
    </div>
    <div class="complexity-lens-section"><span class="complexity-lens-label">READOUT</span><p>${escapeHtml(data.summary || "")}</p></div>
    <div class="complexity-lens-section"><span class="complexity-lens-label">HOW IT WORKS</span><p>${escapeHtml(data.explanation || "No explanation returned.")}</p></div>
    ${data.assumptions ? `<div class="complexity-lens-section"><span class="complexity-lens-label">ASSUMPTIONS</span><p>${escapeHtml(data.assumptions)}</p></div>` : ""}
    ${data.confidence ? `<div class="complexity-lens-section"><span class="complexity-lens-label">CONFIDENCE</span><p>${escapeHtml(data.confidence)}</p></div>` : ""}
    ${data.caveats ? `<div class="complexity-lens-note"><span>NOTE</span><p>${escapeHtml(data.caveats)}</p></div>` : ""}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
  }

  function watchPage() {
    injectButton();
    const observer = new MutationObserver(() => {
      if (!document.getElementById(BUTTON_ID)) injectButton();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.setTimeout(watchPage, 1200);
})();
