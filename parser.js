// Parser utility usable in browser and Node
const PARSE_FIELDS = [
  { key: "title", label: "Title", multiline: false },
  { key: "issueDescription", label: "Issue Description", multiline: true },
  { key: "rack", label: "Rack", multiline: false },
  { key: "idcevo", label: "IDCevo SW", multiline: false },
  { key: "cde", label: "CDE SW", multiline: false },
  { key: "rse", label: "RSE", multiline: false },
  { key: "pdx", label: "PDX Version (only if PDX was tested)", multiline: true },
  { key: "phoneApp", label: "Phone app", multiline: false },
  { key: "pentApp", label: "PEnt phone App / 3rd Party App Version", multiline: false },
  { key: "devices", label: "Mobile devices used", multiline: true },
  { key: "occPerLc", label: "Number of occurrences per LC", multiline: false },
  { key: "lcTested", label: "Number of LCs tested", multiline: false },
  { key: "lcObserved", label: "In how many LCs was this issue observed", multiline: false },
  { key: "timestamp", label: "Time stamp", multiline: false },
  { key: "precondition", label: "Precondition", multiline: true },
  { key: "steps", label: "Steps to reproduce", multiline: true },
  { key: "expected", label: "Expected Behavior", multiline: true },
  { key: "observed", label: "Observed Behavior", multiline: true },
  { key: "recovery", label: "Recovery possible? If yes, detail steps", multiline: false },
  { key: "testCaseId", label: "Test case ID", multiline: false },
  { key: "teamsLink", label: "Link to test execution request in teams channel (if available)", multiline: false },
  { key: "relatedCase", label: "Related Test Case / Context", multiline: false },
  { key: "notes", label: "Notes", multiline: true },
  // Test Doku fields
  { key: "cwWeek", label: "CW", multiline: false },
  { key: "resourceInfo", label: "Day / Resources", multiline: true },
  { key: "testTask", label: "Test Task", multiline: true },
  { key: "rackVehicle", label: "Rack / Vehicle", multiline: false },
  { key: "platform", label: "Platform", multiline: false },
  { key: "vin", label: "VIN", multiline: false },
  { key: "swDetails", label: "SW", multiline: true },
  { key: "apkVersion", label: "APK Version", multiline: false },
  { key: "mobileDevices", label: "Mobile Devices", multiline: true },
  { key: "testTotal", label: "Total", multiline: false },
  { key: "testPassed", label: "Passed", multiline: false },
  { key: "testFailed", label: "Failed", multiline: false },
  { key: "testAborted", label: "Aborted", multiline: false },
  { key: "findings", label: "Findings", multiline: true },
  { key: "newTickets", label: "New created tickets", multiline: true },
  { key: "existingTickets", label: "Already existing tickets", multiline: true },
  { key: "abortedList", label: "Aborted", multiline: true },
];

const BUG_KEYS = new Set([
  "title",
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
  "timestamp",
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

const TEST_KEYS = new Set([
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

const FIELD_ALIASES = {
  cwWeek: ["Calendar Week"],
  resourceInfo: [
    "Resources / Session",
    "Resources",
    "Session",
    "Two Resources",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ],
  testTask: ["Task", "Adhoc"],
  lcObserved: ["In how many LCs was this issue observed?"],
  rackVehicle: ["Rack/Vehicle"],
  swDetails: ["SW Details", "Software"],
  mobileDevices: ["MDs", "MD's", "MD´s", "Mobile Device", "Mobile Device(s)"],
};

function buildLooseLabelRegex(label) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\n)[\\t \\-*]*${esc(label)}\\s*[:：]`, "i");
}

function cleanupValue(text, multiline) {
  const lines = text.replace(/\r\n/g, "\n").split("\n").map((l) => l.trim());
  const stripped = lines
    .map((line) =>
      line
        .replace(/^[>*-]\s*/, "")
        // only remove numbered list when it looks like "1. " or "2) "
        .replace(/^\d+[.)]\s+/, "")
    )
    .filter((line) => !/^[A-Za-z].*[:：]\s*$/.test(line)) // drop standalone headings
    .filter(Boolean);
  if (!stripped.length) return "";
  return multiline ? stripped.join("\n") : stripped.join(" ").trim();
}

function extractStandaloneCW(text) {
  const m = text.match(/(?:^|\n)\s*(CW\s*\d{1,2}(?:[./-]\d{1,2})?)\s*(?=\n|$)/i);
  if (!m) return "";
  return m[1].replace(/\s+/g, "").toUpperCase();
}

function parsePastedText(text, options = {}) {
  const normalized = (text || "").replace(/\r\n/g, "\n");
  const hits = [];
  const mode = options.mode || "all";

  const scopedFields = PARSE_FIELDS.filter((f) => {
    if (mode === "bug") return BUG_KEYS.has(f.key);
    if (mode === "test") return TEST_KEYS.has(f.key);
    return true;
  });

  const allFields = scopedFields.map((f) => ({
    ...f,
    labels: [f.label, ...(FIELD_ALIASES[f.key] || [])],
  }));

  allFields.forEach((field) => {
    field.labels.forEach((lbl) => {
      const re = buildLooseLabelRegex(lbl);
      if (field.key === "abortedList") {
        const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const headingRe = new RegExp(`(?:^|\\n)[\\t \\-*]*${esc(lbl)}\\s*[:：]\\s*(?:\\n|$)`, "ig");
        let match = headingRe.exec(normalized);
        let last = match;
        while (match) {
          last = match;
          match = headingRe.exec(normalized);
        }
        if (last) hits.push({ field, idx: last.index, len: last[0].length });
      } else {
        const m = re.exec(normalized);
        if (m) hits.push({ field, idx: m.index, len: m[0].length });
      }
    });

    // Robust fallback for MD header variants: MDs / MD's / MD´s / MDs:
    if (field.key === "mobileDevices") {
      const mdMatch = /(?:^|\n)[\t \-*]*MD[^\n:：]{0,4}[:：]/i.exec(normalized);
      if (mdMatch) hits.push({ field, idx: mdMatch.index, len: mdMatch[0].length });
    }
  });

  const earliestByField = {};
  hits.forEach((h) => {
    if (!earliestByField[h.field.key] || h.idx < earliestByField[h.field.key].idx) {
      earliestByField[h.field.key] = h;
    }
  });

  const ordered = Object.values(earliestByField).sort((a, b) => a.idx - b.idx);
  const result = {};

  if (ordered.length && mode !== "test") {
    const leading = cleanupValue(normalized.slice(0, ordered[0].idx), true);
    if (leading) result.issueDescription = leading;
  }

  ordered.forEach((item, idx) => {
    const start = item.idx + item.len;
    const end = idx + 1 < ordered.length ? ordered[idx + 1].idx : normalized.length;
    const slice = normalized.slice(start, end);
    const cleaned = cleanupValue(slice, item.field.multiline);
    if (cleaned) result[item.field.key] = cleaned;
  });

  if (!result.cwWeek) {
    const standaloneCW = extractStandaloneCW(normalized);
    if (standaloneCW) result.cwWeek = standaloneCW;
  }

  if (!Object.keys(result).length && normalized.trim()) {
    if (mode === "test") result.findings = normalized.trim();
    else result.issueDescription = normalized.trim();
  }

  return result;
}

const DocParser = { parsePastedText, cleanupValue, buildLooseLabelRegex, PARSE_FIELDS };

if (typeof module !== "undefined") {
  module.exports = DocParser;
} else {
  window.DocParser = DocParser;
}

