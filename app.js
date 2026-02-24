/* Standardization Generator - vanilla JS */
(function () {
  const previewEl = document.getElementById("preview");
  const form = document.getElementById("doc-form");
  const sampleTemplate = document.getElementById("sample-data");
  const importModal = document.getElementById("import-modal");
  const importTextarea = document.getElementById("import-text");
  const modeToggle = document.getElementById("mode-toggle");
  const modeButtons = modeToggle.querySelectorAll("[data-mode]");

  const HISTORY_KEY = "docgen-history-v1";
  const SAVE_KEY_BUG = "docgen-current-v1-bug";
  const SAVE_KEY_TEST = "docgen-current-v1-test";
  let history = loadHistory();
  let currentMode = "bug";

  const fields = Array.from(document.querySelectorAll("[data-field-key]"));

  fields.forEach((el) => {
    const key = el.dataset.fieldKey;

    el.addEventListener("input", () => {
      autosave();
      renderPreview();
      renderSuggestionsFor(key, el.value);
    });

    el.addEventListener("focus", () => renderSuggestionsFor(key, el.value));

    el.addEventListener("blur", () => {
      addToHistory(key, el.value);
      renderSuggestionsFor(key, "");
    });
  });

  document.getElementById("copy-md").addEventListener("click", copyMarkdown);
  document.getElementById("copy-preview").addEventListener("click", copyMarkdown);
  document.getElementById("copy-html").addEventListener("click", copyHtml);
  document.getElementById("download-md").addEventListener("click", downloadMarkdown);
  document.getElementById("clear-form").addEventListener("click", clearForm);
  document.getElementById("load-sample").addEventListener("click", loadSample);
  document.getElementById("open-import").addEventListener("click", openImportModal);
  document.getElementById("cancel-import").addEventListener("click", closeImportModal);
  document.getElementById("parse-import").addEventListener("click", parseImport);
  document.querySelector(".modal-backdrop").addEventListener("click", closeImportModal);
  window.addEventListener("scroll", onScrollSync, { passive: true });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !importModal.classList.contains("hidden")) closeImportModal();
  });
  modeButtons.forEach((btn) => btn.addEventListener("click", () => setMode(btn.dataset.mode)));

  setMode("bug");
  syncCurrentCwWeekOnLoad();

  /* Core rendering */
  function renderPreview() {
    const data = collectFormData();
    const doc = currentMode === "bug" ? buildBugMarkdown(data) : buildTestMarkdown(data);
    previewEl.textContent = doc.trim();
    onScrollSync();
  }

  function collectFormData() {
    const data = {};
    fields.forEach((el) => {
      data[el.dataset.fieldKey] = el.value.trim();
    });
    return data;
  }

  function syncCurrentCwWeekOnLoad() {
    const cwValue = getCurrentCwLabel();
    const cwField = document.querySelector('[data-field-key="cwWeek"]');
    if (cwField) cwField.value = cwValue;
    try {
      const savedTest = JSON.parse(localStorage.getItem(SAVE_KEY_TEST) || "{}");
      localStorage.setItem(SAVE_KEY_TEST, JSON.stringify({ ...savedTest, cwWeek: cwValue, mode: "test" }));
    } catch (err) {
      console.warn("CW prefill failed", err);
    }
  }

  function getCurrentCwLabel(date = new Date()) {
    const week = getIsoWeek(date);
    return `CW${String(week).padStart(2, "0")}`;
  }

  function getIsoWeek(date) {
    const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    return Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
  }

  function buildBugMarkdown(d) {
    const joinList = (value, bullet = "- ") =>
      value
        ? value
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => `${bullet}${line}`)
            .join("\n")
        : "";

    const joinNumbered = (value) =>
      value
        ? value
            .split("\n")
            .map((line) => line.trim())
        .filter(Boolean)
            .map((line, idx) => `${idx + 1}. ${line}`)
            .join("\n")
        : "";

    // Jira 粘贴时，一个星号即可加粗（Wiki 语法）；保持与需求一致
    const bold = (text) => `*${text}*`;
    const labelBullet = (label, value) => (value ? `- ${bold(label)} ${value}` : "");
    const line = (label, value) => `${bold(label)} ${value || "--"}`;
    const block = (label, value) => `${bold(label)}\n${value || "--"}`;

    const docLines = [
      d.title ? bold("Title:") : "",
      d.title || "",
      "",
      bold("Issue Description:"),
      d.issueDescription || "--",
      "",
      bold("Tested SW Version:"),
      labelBullet("Rack:", d.rack),
      labelBullet("IDCevo SW:", d.idcevo),
      labelBullet("CDE SW:", d.cde),
      labelBullet("RSE:", d.rse),
      "",
      bold("PDX Version (only if PDX was tested):"),
      joinList(d.pdx),
      "",
      line("Phone app:", d.phoneApp),
      line("PEnt phone App / 3rd Party App Version:", d.pentApp),
      "",
      bold("Mobile devices used:"),
      joinList(d.devices),
      "",
      bold("Occurrence rate:"),
      block("Number of occurrences per LC:", d.occPerLc),
      "",
      block("Number of LCs tested:", d.lcTested),
      "",
      block("In how many LCs was this issue observed?", d.lcObserved),
      "",
      line("Time stamp:", d.timestamp),
      "",
      bold("Precondition:"),
      joinList(d.precondition),
      "",
      bold("Steps to reproduce:"),
      joinNumbered(d.steps),
      "",
      block("Expected Behavior:", d.expected),
      "",
      block("Observed Behavior:", d.observed),
      "",
      block("Recovery possible? If yes, detail steps:", d.recovery),
      "",
      block("Test case ID:", d.testCaseId),
      "",
      block("Link to test execution request in teams channel (if available):", d.teamsLink),
      "",
      block("Related Test Case / Context:", d.relatedCase),
      "",
      block("Notes:", d.notes),
    ];

    return docLines.filter((x, idx) => x !== "" || docLines[idx + 1] !== "").join("\n");
  }

  function buildTestMarkdown(d) {
    const joinList = (value, bullet = "- ") =>
      value
        ? value
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => `${bullet}${line}`)
            .join("\n")
        : "";

    const joinNumbered = (value) =>
      value
        ? value
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line, idx) => `${idx + 1}. ${line}`)
            .join("\n")
        : "";

    const bold = (t) => `*${t}*`;
    const block = (label, value) => `${bold(label)}\n${value || "--"}`;

    const docLines = [
      block("CW:", d.cwWeek || d.cw),
      "",
      block("Day / Resources:", d.resourceInfo || d.sessionInfo),
      "",
      block("Test Task:", d.testTask),
      "",
      block("Rack / Vehicle:", d.rackVehicle),
      "",
      block("Platform:", d.platform),
      "",
      block("VIN:", d.vin),
      "",
      bold("SW:"),
      joinList(d.swDetails),
      "",
      block("APK Version:", d.apkVersion),
      "",
      bold("MDs:"),
      joinList(d.mobileDevices),
      "",
      bold("Test Results:"),
      `- Total: ${d.testTotal || "--"}`,
      `- Passed: ${d.testPassed || "--"}`,
      `- Failed: ${d.testFailed || "--"}`,
      `- Aborted: ${d.testAborted || "--"}`,
      "",
      block("Findings:", d.findings),
      "",
      bold("New created tickets:"),
      joinNumbered(d.newTickets),
      "",
      bold("Already existing tickets:"),
      joinNumbered(d.existingTickets),
      "",
      bold("Aborted:"),
      joinList(d.abortedList),
    ];

    return docLines.filter((x, idx) => x !== "" || docLines[idx + 1] !== "").join("\n");
  }

  function buildTestHtml(d) {
    const linkify = (str = "") =>
      (str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>")
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');

    const listify = (value, ordered = false) => {
      if (!value) return "";
      const items = value
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => `<li>${linkify(v)}</li>`)
        .join("");
      if (!items) return "";
      return ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`;
    };

    return [
      `<p><strong>CW:</strong><br>${linkify(d.cwWeek || d.cw || "--")}</p>`,
      `<p><strong>Day / Resources:</strong><br>${linkify(d.resourceInfo || d.sessionInfo || "--")}</p>`,
      `<p><strong>Test Task:</strong><br>${linkify(d.testTask || "--")}</p>`,
      `<p><strong>Rack / Vehicle:</strong><br>${linkify(d.rackVehicle || "--")}</p>`,
      `<p><strong>Platform:</strong><br>${linkify(d.platform || "--")}</p>`,
      `<p><strong>VIN:</strong><br>${linkify(d.vin || "--")}</p>`,
      `<p><strong>SW:</strong></p>${listify(d.swDetails) || "<p>--</p>"}`,
      `<p><strong>APK Version:</strong><br>${linkify(d.apkVersion || "--")}</p>`,
      `<p><strong>MDs:</strong></p>${listify(d.mobileDevices) || "<p>--</p>"}`,
      `<p><strong>Test Results:</strong></p><ul>
        <li>Total: ${linkify(d.testTotal || "--")}</li>
        <li>Passed: ${linkify(d.testPassed || "--")}</li>
        <li>Failed: ${linkify(d.testFailed || "--")}</li>
        <li>Aborted: ${linkify(d.testAborted || "--")}</li>
      </ul>`,
      `<p><strong>Findings:</strong><br>${linkify(d.findings || "--")}</p>`,
      `<p><strong>New created tickets:</strong></p>${listify(d.newTickets, true) || "<p>--</p>"}`,
      `<p><strong>Already existing tickets:</strong></p>${listify(d.existingTickets, true) || "<p>--</p>"}`,
      `<p><strong>Aborted:</strong></p>${listify(d.abortedList) || "<p>--</p>"}`,
    ].join("\n");
  }

  function buildHtml(d) {
    if (currentMode === "test") return buildTestHtml(d);
    const esc = (str = "") =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");

    const linkify = (str = "") =>
      esc(str).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');

    const listify = (value) => {
      if (!value) return "";
      const items = value
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => `<li>${linkify(v)}</li>`)
        .join("");
      return items ? `<ul>${items}</ul>` : "";
    };

    const orderedListify = (value) => {
      if (!value) return "";
      const items = value
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => `<li>${linkify(v)}</li>`)
        .join("");
      return items ? `<ol>${items}</ol>` : "";
    };

    const labelledLi = (label, value) => (value ? `<li><strong>${label}</strong> ${linkify(value)}</li>` : "");
    const paragraph = (label, value) =>
      `<p><strong>${label}</strong><br>${linkify(value || "--")}</p>`;

    const parts = [];
    if (d.title) parts.push(`<p><strong>Title:</strong> ${linkify(d.title)}</p>`);

    parts.push(
      `<p><strong>Issue Description:</strong><br>${linkify(d.issueDescription || "--")}</p>`,
      `<p><strong>Tested SW Version:</strong></p><ul>${labelledLi("Rack:", d.rack)}${labelledLi(
        "IDCevo SW:",
        d.idcevo
      )}${labelledLi("CDE SW:", d.cde)}${labelledLi("RSE:", d.rse)}</ul>`,
      `<p><strong>PDX Version (only if PDX was tested):</strong></p>${listify(d.pdx) || "<p>--</p>"}`,
      paragraph("Phone app:", d.phoneApp),
      paragraph("PEnt phone App / 3rd Party App Version:", d.pentApp),
      `<p><strong>Mobile devices used:</strong></p>${listify(d.devices) || "<p>--</p>"}`,
      `<p><strong>Occurrence rate:</strong></p>
      <p><strong>Number of occurrences per LC:</strong><br>${linkify(d.occPerLc || "--")}</p>
      <p><strong>Number of LCs tested:</strong><br>${linkify(d.lcTested || "--")}</p>
      <p><strong>In how many LCs was this issue observed?</strong><br>${linkify(d.lcObserved || "--")}</p>`,
      paragraph("Time stamp:", d.timestamp),
      `<p><strong>Precondition:</strong></p>${listify(d.precondition) || "<p>--</p>"}`,
      `<p><strong>Steps to reproduce:</strong></p>${orderedListify(d.steps) || "<p>--</p>"}`,
      paragraph("Expected Behavior:", d.expected),
      paragraph("Observed Behavior:", d.observed),
      paragraph("Recovery possible? If yes, detail steps:", d.recovery),
      paragraph("Test case ID:", d.testCaseId),
      paragraph("Link to test execution request in teams channel (if available):", d.teamsLink),
      paragraph("Related Test Case / Context:", d.relatedCase),
      paragraph("Notes:", d.notes)
    );

    return parts.join("\n");
  }

  // Override renderers: only output sections that have content.
  function buildBugMarkdown(d) {
    const bold = (text) => `*${text}*`;
    const toLines = (value) =>
      (value || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    const has = (value) => toLines(value).length > 0;
    const out = [];

    const pushBlock = (label, value) => {
      if (!has(value)) return;
      out.push(bold(label), value.trim(), "");
    };

    const pushList = (label, value, ordered = false) => {
      const lines = toLines(value);
      if (!lines.length) return;
      out.push(bold(label));
      lines.forEach((line, idx) => out.push(ordered ? `${idx + 1}. ${line}` : `- ${line}`));
      out.push("");
    };

    pushBlock("Title:", d.title);
    pushBlock("Issue Description:", d.issueDescription);

    if (has(d.rack) || has(d.idcevo) || has(d.cde) || has(d.rse)) {
      out.push(bold("Tested SW Version:"), "");
      pushBlock("Rack:", d.rack);
      pushBlock("IDCevo SW:", d.idcevo);
      pushBlock("CDE SW:", d.cde);
      pushBlock("RSE:", d.rse);
    }

    pushList("PDX Version (only if PDX was tested):", d.pdx);
    pushBlock("Phone app:", d.phoneApp);
    pushBlock("PEnt phone App / 3rd Party App Version:", d.pentApp);
    pushList("Mobile devices used:", d.devices);

    if (has(d.occPerLc) || has(d.lcTested) || has(d.lcObserved)) {
      out.push(bold("Occurrence rate:"), "");
      pushBlock("Number of occurrences per LC:", d.occPerLc);
      pushBlock("Number of LCs tested:", d.lcTested);
      pushBlock("In how many LCs was this issue observed?", d.lcObserved);
    }

    pushBlock("Time stamp:", d.timestamp);
    pushList("Precondition:", d.precondition);
    pushList("Steps to reproduce:", d.steps, true);
    pushBlock("Expected Behavior:", d.expected);
    pushBlock("Observed Behavior:", d.observed);
    pushBlock("Recovery possible? If yes, detail steps:", d.recovery);
    pushBlock("Test case ID:", d.testCaseId);
    pushBlock("Link to test execution request in teams channel (if available):", d.teamsLink);
    pushBlock("Related Test Case / Context:", d.relatedCase);
    pushBlock("Notes:", d.notes);

    while (out.length && out[out.length - 1] === "") out.pop();
    return out.join("\n");
  }

  function buildTestMarkdown(d) {
    const bold = (text) => `*${text}*`;
    const toLines = (value) =>
      (value || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    const has = (value) => toLines(value).length > 0;
    const out = [];

    const pushBlock = (label, value) => {
      if (!has(value)) return;
      out.push(bold(label), value.trim(), "");
    };

    const pushList = (label, value, ordered = false) => {
      const lines = toLines(value);
      if (!lines.length) return;
      out.push(bold(label));
      lines.forEach((line, idx) => out.push(ordered ? `${idx + 1}. ${line}` : `- ${line}`));
      out.push("");
    };

    pushBlock("CW:", d.cwWeek || d.cw);
    pushBlock("Day / Resources:", d.resourceInfo || d.sessionInfo);
    pushBlock("Test Task:", d.testTask);
    pushBlock("Rack / Vehicle:", d.rackVehicle);
    pushBlock("Platform:", d.platform);
    pushBlock("VIN:", d.vin);
    pushList("SW:", d.swDetails);
    pushBlock("APK Version:", d.apkVersion);
    pushList("MDs:", d.mobileDevices);

    if (has(d.testTotal) || has(d.testPassed) || has(d.testFailed) || has(d.testAborted)) {
      out.push(bold("Test Results:"), "");
      pushBlock("Total:", d.testTotal);
      pushBlock("Passed:", d.testPassed);
      pushBlock("Failed:", d.testFailed);
      pushBlock("Aborted:", d.testAborted);
    }

    pushBlock("Findings:", d.findings);
    pushList("New created tickets:", d.newTickets, true);
    pushList("Already existing tickets:", d.existingTickets, true);
    pushList("Aborted:", d.abortedList);

    while (out.length && out[out.length - 1] === "") out.pop();
    return out.join("\n");
  }

  function buildTestHtml(d) {
    const esc = (str = "") =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
    const linkify = (str = "") =>
      esc(str).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');
    const toLines = (value) =>
      (value || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    const has = (value) => toLines(value).length > 0;
    const parts = [];

    const addBlock = (label, value) => {
      if (!has(value)) return;
      parts.push(`<p><strong>${label}</strong><br>${linkify(value.trim())}</p>`);
    };

    const addList = (label, value, ordered = false) => {
      const lines = toLines(value);
      if (!lines.length) return;
      const items = lines.map((line) => `<li>${linkify(line)}</li>`).join("");
      const tag = ordered ? "ol" : "ul";
      parts.push(`<p><strong>${label}</strong></p><${tag}>${items}</${tag}>`);
    };

    addBlock("CW:", d.cwWeek || d.cw);
    addBlock("Day / Resources:", d.resourceInfo || d.sessionInfo);
    addBlock("Test Task:", d.testTask);
    addBlock("Rack / Vehicle:", d.rackVehicle);
    addBlock("Platform:", d.platform);
    addBlock("VIN:", d.vin);
    addList("SW:", d.swDetails);
    addBlock("APK Version:", d.apkVersion);
    addList("MDs:", d.mobileDevices);

    if (has(d.testTotal) || has(d.testPassed) || has(d.testFailed) || has(d.testAborted)) {
      parts.push("<p><strong>Test Results:</strong></p>");
      addBlock("Total:", d.testTotal);
      addBlock("Passed:", d.testPassed);
      addBlock("Failed:", d.testFailed);
      addBlock("Aborted:", d.testAborted);
    }

    addBlock("Findings:", d.findings);
    addList("New created tickets:", d.newTickets, true);
    addList("Already existing tickets:", d.existingTickets, true);
    addList("Aborted:", d.abortedList);

    return parts.join("\n");
  }

  function buildHtml(d) {
    if (currentMode === "test") return buildTestHtml(d);

    const esc = (str = "") =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
    const linkify = (str = "") =>
      esc(str).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');
    const toLines = (value) =>
      (value || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    const has = (value) => toLines(value).length > 0;
    const parts = [];

    const addBlock = (label, value) => {
      if (!has(value)) return;
      parts.push(`<p><strong>${label}</strong><br>${linkify(value.trim())}</p>`);
    };

    const addList = (label, value, ordered = false) => {
      const lines = toLines(value);
      if (!lines.length) return;
      const items = lines.map((line) => `<li>${linkify(line)}</li>`).join("");
      const tag = ordered ? "ol" : "ul";
      parts.push(`<p><strong>${label}</strong></p><${tag}>${items}</${tag}>`);
    };

    addBlock("Title:", d.title);
    addBlock("Issue Description:", d.issueDescription);

    if (has(d.rack) || has(d.idcevo) || has(d.cde) || has(d.rse)) {
      parts.push("<p><strong>Tested SW Version:</strong></p>");
      addBlock("Rack:", d.rack);
      addBlock("IDCevo SW:", d.idcevo);
      addBlock("CDE SW:", d.cde);
      addBlock("RSE:", d.rse);
    }

    addList("PDX Version (only if PDX was tested):", d.pdx);
    addBlock("Phone app:", d.phoneApp);
    addBlock("PEnt phone App / 3rd Party App Version:", d.pentApp);
    addList("Mobile devices used:", d.devices);

    if (has(d.occPerLc) || has(d.lcTested) || has(d.lcObserved)) {
      parts.push("<p><strong>Occurrence rate:</strong></p>");
      addBlock("Number of occurrences per LC:", d.occPerLc);
      addBlock("Number of LCs tested:", d.lcTested);
      addBlock("In how many LCs was this issue observed?", d.lcObserved);
    }

    addBlock("Time stamp:", d.timestamp);
    addList("Precondition:", d.precondition);
    addList("Steps to reproduce:", d.steps, true);
    addBlock("Expected Behavior:", d.expected);
    addBlock("Observed Behavior:", d.observed);
    addBlock("Recovery possible? If yes, detail steps:", d.recovery);
    addBlock("Test case ID:", d.testCaseId);
    addBlock("Link to test execution request in teams channel (if available):", d.teamsLink);
    addBlock("Related Test Case / Context:", d.relatedCase);
    addBlock("Notes:", d.notes);

    return parts.join("\n");
  }

  /* Import pasted text */
  const PARSE_FIELDS = window.DocParser.PARSE_FIELDS;

  function openImportModal() {
    importTextarea.value = "";
    importModal.classList.remove("hidden");
    importTextarea.focus();
  }

  function closeImportModal() {
    importModal.classList.add("hidden");
  }

  function parseImport() {
    const raw = importTextarea.value || "";
    if (!raw.trim()) {
      showToast("请先粘贴内容")();
      return;
    }

    const data = window.DocParser.parsePastedText(raw, { mode: currentMode });
    const filledKeys = Object.keys(data).filter((k) => data[k]);
    if (!filledKeys.length) {
      showToast("未识别到可用字段，请检查粘贴内容的标签")();
      return;
    }
    closeImportModal();
    applyParsedData(data);
    autosave();
    renderPreview();
    renderAllSuggestionBars();
    onScrollSync();
    showToast(`已导入 ${filledKeys.length} 个字段`)();
  }

  const FIELD_ALIASES = {
    lcObserved: ["In how many LCs was this issue observed?"],
  };

  function parsePastedText(text) {
    // kept for backward compatibility; now delegates to parser.js
    return window.DocParser.parsePastedText(text);
  }

  function applyParsedData(data) {
    // For any field not present in parsed data, clear it
    fields.forEach((el) => {
      const key = el.dataset.fieldKey;
      el.value = data[key] || "";
    });
  }

  /* Scroll sync: keep preview aligned with form progress */
  let scrollSyncFrame = null;
  function onScrollSync() {
    if (scrollSyncFrame) return;
    scrollSyncFrame = requestAnimationFrame(() => {
      scrollSyncFrame = null;
      const formPanel = document.querySelector(".form-panel");
      if (!formPanel) return;
      const previewBox = previewEl;

      const formHeight = formPanel.scrollHeight;
      const viewport = window.innerHeight;
      const formTop = formPanel.getBoundingClientRect().top + window.scrollY;
      const scrollableForm = Math.max(formHeight - viewport, 1);
      const progress = clamp((window.scrollY - formTop) / scrollableForm, 0, 1);

      const previewScrollable = previewBox.scrollHeight - previewBox.clientHeight;
      if (previewScrollable > 0) {
        previewBox.scrollTop = progress * previewScrollable;
      } else {
        previewBox.scrollTop = 0;
      }
    });
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  /* History + suggestions */
  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}");
    } catch (err) {
      console.warn("History load failed", err);
      return {};
    }
  }

  function saveHistory() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  function addToHistory(key, value) {
    const trimmed = (value || "").trim();
    if (!trimmed) return;
    if (!history[key]) history[key] = [];
    if (!history[key].includes(trimmed)) {
      history[key].unshift(trimmed);
      if (history[key].length > 15) history[key].pop();
      saveHistory();
    }
  }

  function renderSuggestionsFor(key, query = "") {
    const container = document.querySelector(`.suggestions[data-for="${key}"]`);
    if (!container) return;

    const list = history[key] || [];
    const lower = query.toLowerCase();
    const filtered = lower ? list.filter((v) => v.toLowerCase().includes(lower)) : list;
    container.innerHTML = "";

    filtered.slice(0, 6).forEach((val) => {
      const chip = document.createElement("span");
      chip.className = "suggestion-chip";
      chip.textContent = val.length > 80 ? `${val.slice(0, 77)}…` : val;
      chip.title = val;
      chip.addEventListener("click", () => {
        const target = document.querySelector(`[data-field-key="${key}"]`);
        if (!target) return;
        target.value = val;
        target.focus();
        target.dispatchEvent(new Event("input"));
      });
      container.appendChild(chip);
    });
  }

  function renderAllSuggestionBars() {
    fields.forEach((el) => renderSuggestionsFor(el.dataset.fieldKey, ""));
  }

  /* Autosave current form */
  function autosave() {
    const data = collectFormData();
    const key = currentMode === "bug" ? SAVE_KEY_BUG : SAVE_KEY_TEST;
    localStorage.setItem(key, JSON.stringify({ ...data, mode: currentMode }));
  }

  function restoreAutosave() {
    try {
      const savedBug = JSON.parse(localStorage.getItem(SAVE_KEY_BUG) || "{}");
      const savedTest = JSON.parse(localStorage.getItem(SAVE_KEY_TEST) || "{}");
      const saved = currentMode === "bug" ? savedBug : savedTest;
      fields.forEach((el) => {
        const key = el.dataset.fieldKey;
        if (saved && saved[key]) {
          el.value = saved[key];
        } else if (currentMode === "bug" && isTestField(key)) {
          el.value = "";
        } else if (currentMode === "test" && isBugField(key)) {
          el.value = "";
        }
      });
    } catch (err) {
      console.warn("No autosave to restore", err);
    }
  }

  /* Buttons */
  function clearForm() {
    form.reset();
    autosave();
    renderPreview();
    onScrollSync();
  }

  function loadSample() {
    try {
      const payload = JSON.parse(sampleTemplate.innerHTML);
      const sample = payload[currentMode] || payload;
      fields.forEach((el) => {
        const key = el.dataset.fieldKey;
        el.value = sample[key] || "";
      });
      autosave();
      renderPreview();
      renderAllSuggestionBars();
      onScrollSync();
    } catch (err) {
      console.error("Sample load failed", err);
    }
  }

  function copyMarkdown() {
    const text = previewEl.textContent;
    if (!text) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(showToast("已复制到剪贴板")).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }

    function fallbackCopy() {
      const temp = document.createElement("textarea");
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      document.body.removeChild(temp);
      showToast("已复制")(null);
    }
  }

  function copyHtml() {
    const data = collectFormData();
    const html = buildHtml(data);
    const plain = currentMode === "bug" ? buildBugMarkdown(data) : buildTestMarkdown(data);

    if (navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== "undefined") {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      });
      navigator.clipboard
        .write([item])
        .then(showToast("已复制 Jira 富文本"))
        .catch(fallbackCopy);
    } else {
      fallbackCopy();
    }

    function fallbackCopy() {
      const temp = document.createElement("div");
      temp.innerHTML = html;
      temp.style.position = "fixed";
      temp.style.pointerEvents = "none";
      temp.style.opacity = "0";
      temp.style.left = "-9999px";
      document.body.appendChild(temp);

      const range = document.createRange();
      range.selectNodeContents(temp);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      const ok = document.execCommand("copy");

      sel.removeAllRanges();
      document.body.removeChild(temp);

      showToast(ok ? "已复制（富文本）" : "复制失败，请手动 Ctrl+C")(null);
    }
  }

  function downloadMarkdown() {
    const text = previewEl.textContent;
    if (!text) return;
    const blob = new Blob([text], { type: "text/markdown" });
    const link = document.createElement("a");
    const ts = new Date().toISOString().split("T")[0];
    const title =
      currentMode === "bug"
        ? document.getElementById("title").value.trim() || "issue-report"
        : document.getElementById("rackVehicle").value.trim() || "test-doku";
    link.download = `${slugify(title)}-${ts}.md`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /* Utilities */
  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  function showToast(message) {
    return () => {
      const existing = document.getElementById("toast");
      if (existing) existing.remove();
      const toast = document.createElement("div");
      toast.id = "toast";
      toast.textContent = message;
      toast.style.position = "fixed";
      toast.style.bottom = "20px";
      toast.style.right = "20px";
      toast.style.padding = "10px 14px";
      toast.style.background = "rgba(15, 23, 42, 0.9)";
      toast.style.border = "1px solid rgba(255,255,255,0.12)";
      toast.style.color = "#f8fafc";
      toast.style.borderRadius = "10px";
      toast.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
      toast.style.zIndex = "999";
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 1400);
    };
  }

  /* Mode handling */
  const BUG_FIELDS = new Set([
    "title",
    "timestamp",
    "issueDescription",
    "rack",
    "idcevo",
    "cde",
    "rse",
    "pdx",
    "phoneApp",
    "pentApp",
    "devices",
    "occPerLc",
    "lcTested",
    "lcObserved",
    "precondition",
    "steps",
    "expected",
    "observed",
    "recovery",
    "testCaseId",
    "teamsLink",
    "relatedCase",
    "notes",
  ]);

  const TEST_FIELDS = new Set([
    "cw",
    "sessionInfo",
    "cwWeek",
    "resourceInfo",
    "testTask",
    "rackVehicle",
    "platform",
    "vin",
    "swDetails",
    "apkVersion",
    "mobileDevices",
    "testTotal",
    "testPassed",
    "testFailed",
    "testAborted",
    "findings",
    "newTickets",
    "existingTickets",
    "abortedList",
  ]);

  function isBugField(key) {
    return BUG_FIELDS.has(key);
  }
  function isTestField(key) {
    return TEST_FIELDS.has(key);
  }

  function setMode(mode) {
    currentMode = mode;
    document.body.classList.toggle("mode-bug", mode === "bug");
    document.body.classList.toggle("mode-test", mode === "test");
    modeButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.mode === mode));
    restoreAutosave();
    renderPreview();
    renderAllSuggestionBars();
    onScrollSync();
  }
})();
