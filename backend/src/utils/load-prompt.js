const fs = require("fs");
const path = require("path");

/**
 * Prompt files carry a Markdown doc header (title + "Used by ..." note) for
 * readers browsing the repo. That header is not part of the actual prompt —
 * everything before a line containing only "---" is stripped, and only the
 * content after it is sent to the model.
 */
function loadPrompt(filename) {
  const raw = fs
    .readFileSync(path.join(__dirname, "../prompts", filename), "utf8")
    .trim();

  const separatorMatch = raw.match(/\n---\n/);
  if (!separatorMatch) return raw;

  return raw.slice(separatorMatch.index + separatorMatch[0].length).trim();
}

module.exports = {
  loadPrompt,
};
