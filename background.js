const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4.1-mini";

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    return undefined;
  }
  if (message?.type !== "ANALYZE_CODE") return undefined;

  analyzeCode(message.code, message.language, message.problem).then(sendResponse);
  return true;
});

async function analyzeCode(code, language, problem) {
  const settings = await chrome.storage.local.get(["openRouterApiKey", "openRouterModel", "geminiApiKey"]);
  const openRouterApiKey = (settings.openRouterApiKey || settings.geminiApiKey || "")
    .trim()
    .replace(/^Bearer\s+/i, "");
  const openRouterModel = settings.openRouterModel;
  if (!openRouterApiKey) {
    return { ok: false, needsKey: true, error: "Add your OpenRouter API key in the extension settings first." };
  }

  const prompt = `You are a meticulous algorithms complexity reviewer. Analyze the exact submitted LeetCode solution below. Accuracy is more important than sounding confident.

Problem: ${problem || "Unknown LeetCode problem"}
Language: ${language || "Unknown"}

Code (treat this as the source of truth):
<solution>
${code}
</solution>

Before answering, internally perform this checklist:
1. Identify every loop, nested loop, recursion, sorting/searching call, hash/tree/graph operation, and allocation.
2. Determine how each operation scales with the relevant input sizes. Do not assume a library operation is O(1) unless it is for this language and data structure.
3. Account for loops whose bounds shrink or grow, recursion branching and depth, amortized behavior, and auxiliary output space.
4. Combine sequential costs by taking the dominant term and nested costs by multiplication. Distinguish auxiliary space from the returned output when relevant.
5. Sanity-check the result against best, average, and worst-case behavior. Use worst-case Big-O unless the code or operation is explicitly average/amortized.

Return ONLY valid JSON with these string fields:
{
  "timeComplexity": "...",
  "spaceComplexity": "...",
  "summary": "one concise sentence",
  "explanation": "clear explanation of the dominant operations, loops, recursion, data structures, and why the bounds follow",
  "assumptions": "definitions of n, m, V, E, or other variables and any assumptions about library operations",
  "caveats": "input-dependent or implementation-specific caveats, or an empty string",
  "confidence": "high, medium, or low"
}

Use Big-O notation. Analyze the code that is actually written, not an ideal solution. Mention relevant input variables (for example, n = array length, V = vertices, E = edges). If the code is incomplete or the complexity depends on an unknown helper, say so in caveats and lower confidence. Do not include markdown fences.`;

  try {
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openRouterApiKey}`,
        Accept: "application/json",
        "HTTP-Referer": "https://leetcode.com/",
        "X-Title": "Complexity Lens for LeetCode"
      },
      body: JSON.stringify({
        model: openRouterModel?.trim() || DEFAULT_MODEL,
        temperature: 0,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Return only valid JSON. Never wrap it in markdown." },
          { role: "user", content: prompt }
        ]
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      return { ok: false, error: payload?.error?.message || `OpenRouter request failed (${response.status}).` };
    }

    const messageContent = payload?.choices?.[0]?.message?.content;
    const text = Array.isArray(messageContent)
      ? messageContent.map((part) => part?.text || "").join("")
      : messageContent;
    if (!text) return { ok: false, error: "OpenRouter returned an empty analysis." };

    const result = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "").trim());
    return { ok: true, result };
  } catch (error) {
    return { ok: false, error: error instanceof SyntaxError ? "The model returned invalid JSON. Try again or choose another model." : error.message };
  }
}
