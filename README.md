# Complexity Lens for LeetCode

A Manifest V3 Chrome extension that adds an **Analyze** button beside LeetCode's Submit button. It sends the code currently visible in the LeetCode Monaco editor to an OpenRouter-selected model and displays a time/space complexity report in a separate dialog.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this folder.
4. Open the extension's **Details** page, choose **Extension options**, and paste your OpenRouter API key.
5. Open a LeetCode problem and click **Analyze** - besides the **Submit** button.


## How to get API KEY- 

1. Open [Openrouter](https://openrouter.ai/workspaces/default/keys)
2. login or signup
3. Create key- 
	1. Set it to unlimited already set most probably.
	2. create and copy
4. paste it in the extension dialog box 
5. Save and enjoy unlimited analysis.


The API key is stored in `chrome.storage.local`; it is not embedded in the extension source. OpenRouter usage may incur charges or be subject to the selected provider's limits. The extension asks the model to return worst-case complexity, but no LLM can guarantee a correct answer for every program; review the displayed assumptions and explanation.
