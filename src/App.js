import React, { useMemo, useState, useEffect } from "react";

/* ============================================
   Section label definitions (can be refined)
============================================ */
const SECTIONS = {
  traits: [
    "Warmth / empathy",
    "Helpful",
    "Cause Motivated",
    "Self-Improvement",
    "Enthusiastic",
    "Open / reflective",
    "Wants Capable Leader",
    "Self-Motivated",
    "Takes Initiative",
    "Wants Recognition",
    "Wants Stable Career",
    "Wants Challenge",
    "Self-Acceptance",
    "Diplomatic",
    "Flexible",
    "Wants Frankness",
    "Tolerance Of Bluntness",
    "Planning",
    "Outgoing",
    "Analyzes Pitfalls",
    "Enlists Cooperation",
    "Wants High Pay",
    "Risking",
    "Wants Autonomy",
    "Organized",
    "Wants To Lead",
    "Optimistic",
    "Persistent",
    "Experimenting",
    "Assertive",
    "Analytical",
    "Manages Stress Well",
    "Systematic",
    "Comfort With Conflict",
    "Tempo",
    "Intuitive",
    "Authoritative",
    "Collaborative",
    "Tolerance Of Structure",
    "Influencing",
    "Frank",
    "Certain",
    "Enforcing",
    "Wants Diplomacy",
    "Relaxed",
    "Precise",
  ],
  expectations: [
    "Wants Advancement",
    "Wants Quick Pay Increases",
    "Wants Opinions Valued",
    "Wants Development",
    "Wants Social Opportunities",
    "Wants Work/Life Balance",
    "Wants Appreciation",
    "Wants Flexible Work Time",
    "Wants Personal Help",
    "Wants To Be Informed",
  ],
  taskPrefs: [
    "Artistic",
    "Manual Work",
    "Public Speaking",
    "Research / learning",
    "Teaching",
    "Driving",
    "Building / making",
    "Clerical",
    "Computers",
    "Numerical",
    "Mechanical",
    "Physical Work",
  ],
  interests: [
    "Selling",
    "Animals",
    "Psychology",
    "Children",
    "Writing / language",
    "Travel",
    "Manufacturing",
    "Legal Matters",
    "Computer Hardware",
    "Biology",
    "Medical Science",
    "Computer Software",
    "Finance / business",
    "Health / medicine",
    "Science",
    "Physical Science",
    "Sports",
    "Electronics",
    "Plants",
    "Food",
    "Entertainment",
  ],
  workEnv: [
    "Team",
    "Public Contact",
    "Noise",
    "Repetition",
    "Outdoors",
    "Pressure Tolerance",
    "Sitting",
    "Standing",
  ],
  behavioral: [
    "People Oriented",
    "Innovative",
    "Provides Direction",
    "Handles Autonomy",
    "Doesn't Need Structure",
    "Receives Correction",
    "Coaching",
    "Organizational Compatibility",
    "Judgment (strategic)",
    "Handles Conflict",
    "Self-Employed",
    "Interpersonal Skills",
    "Effective Enforcing",
    "Negotiating",
    "Tolerance Of Evasiveness",
  ],
  functions: [
    "Administration - General",
    "Sales - Cold Calling",
    "Management - Upper",
    "Supervisory",
    "Management - Middle",
    "Customer Service - Friendly",
    "Technical",
  ],
};

/* ============================================
   Composite 4‑way mini‑charts
============================================ */
const COMPOSITES = {
  Outlook: ["Certain", "Optimistic", "Open / reflective", "Outgoing"],
  Decisions: ["Analytical", "Collaborative", "Intuitive", "Authoritative"],
  Innovation: ["Persistent", "Tempo", "Experimenting", "Risking"],
  Communication: [
    "Frank",
    "Tolerance Of Bluntness",
    "Diplomatic",
    "Influencing",
  ],
  Power: ["Assertive", "Wants Capable Leader", "Helpful", "Wants Autonomy"],
  Motivation: [
    "Self-Motivated",
    "Cause Motivated",
    "Manages Stress Well",
    "Wants High Pay",
  ],
  Support: [
    "Self-Acceptance",
    "Wants Recognition",
    "Self-Improvement",
    "Warmth / empathy",
  ],
  Organization: ["Organized", "Tolerance Of Structure", "Flexible", "Precise"],
  Leadership: [
    "Provides Direction",
    "Enforcing",
    "Planning",
    "Comfort With Conflict",
  ],
};

const TRAIT_ALIASES = {
  "problem solving": "Analytical",
  "open/reflective": "Open / reflective",
  "cause motivate": "Cause Motivated",
  "stress management": "Manages Stress Well",
  "takes autonomy": "Wants Autonomy",
  "tolerance of bluntness": "Tolerance Of Bluntness",
  "provides direction": "Provides Direction",
  "provides leadership": "Provides Direction",
  "handles conflict": "Comfort With Conflict",
};

/* ============================================
   Helpers
============================================ */
const clamp10 = (x) => Math.max(0, Math.min(10, x));
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

function parseCSV(text) {
  const t = (text || "").trim();
  if (!t) return {};
  const lines = t.split(/\r?\n/).filter(Boolean);
  const out = {};
  if (!lines.length) return out;
  const header = lines[0].toLowerCase();
  const body =
    header.includes("score") && header.includes("statement")
      ? lines.slice(1)
      : lines;
  for (const line of body) {
    const m = line.match(/^([^,]+),(.*)$/);
    if (!m) continue;
    const rawScore = m[1];
    let stmt = m[2] || "";
    if (stmt.startsWith('"') && stmt.endsWith('"'))
      stmt = stmt.slice(1, -1).replace(/""/g, '"');
    const v = parseFloat(String(rawScore).replace(",", "."));
    if (Number.isFinite(v)) out[stmt.trim()] = v;
  }
  return out;
}

function findSectionForLabel(label) {
  for (const [section, arr] of Object.entries(SECTIONS))
    if (arr.includes(label)) return section;
  return "traits";
}

function computeScores(answersRaw, weightsJSON) {
  if (!weightsJSON) return {};
  const answersLower = {};
  for (const [k, v] of Object.entries(answersRaw || {}))
    answersLower[norm(k)] = Number(v);

  const byLabel = weightsJSON.generic
    ? weightsJSON.generic
    : (() => {
        const tmp = {};
        for (const [, labels] of Object.entries(weightsJSON || {})) {
          for (const [lbl, map] of Object.entries(labels || {})) tmp[lbl] = map;
        }
        return tmp;
      })();

  const result = {
    traits: {},
    expectations: {},
    taskPrefs: {},
    interests: {},
    workEnv: {},
    behavioral: {},
    functions: {},
  };

  for (const [label, mapping] of Object.entries(byLabel)) {
    if (!mapping || typeof mapping !== "object") continue;
    let val = Number(mapping._intercept || 0);
    for (const [feat, w] of Object.entries(mapping)) {
      if (feat === "_intercept") continue;
      const a = answersLower[norm(feat)];
      if (Number.isFinite(a)) val += a * Number(w);
    }
    const score = clamp10(val);
    const sec = findSectionForLabel(label);
    result[sec][label] = score;
  }
  return result;
}

/* Round Interests & Expectations to N.0; others 1dp */
function formatScore(sectionKey, value) {
  if (!Number.isFinite(value)) return "";
  if (sectionKey === "interests") return Math.round(value).toFixed(1);
  if (sectionKey === "expectations") return Math.round(value).toFixed(1);
  return value.toFixed(1);
}

/* CSV helpers */
function toCSVFromPairs(pairs) {
  const header = "score,statement\n";
  const body = (pairs || [])
    .map((p) => `${p.score},"${String(p.statement).replace(/"/g, '""')}"`)
    .join("\n");
  return header + body;
}
function downloadCSV(objOrText, filename = "report.csv") {
  let content = "";
  if (typeof objOrText === "string") {
    content = objOrText;
  } else if (
    objOrText &&
    typeof objOrText === "object" &&
    "traits" in objOrText &&
    "interests" in objOrText
  ) {
    const rows = [["Category", "Trait", "Score"]];
    for (const [sect, vals] of Object.entries(objOrText || {})) {
      for (const [k, v] of Object.entries(vals || {})) {
        let outVal = v;
        if (
          Number.isFinite(v) &&
          (sect === "interests" || sect === "expectations")
        )
          outVal = Number(Math.round(v).toFixed(1));
        rows.push([sect, k, outVal]);
      }
    }
    content = rows.map((r) => r.join(",")).join("\n");
  } else {
    content = String(objOrText ?? "");
  }
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function downloadPDF() {
  window.print();
}

/* ============================================
   Excel (SheetJS) + Raw→Pairs converter
============================================ */
async function ensureXLSXLoaded() {
  if (window.XLSX) return window.XLSX;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load XLSX lib"));
    document.head.appendChild(s);
  });
  return window.XLSX;
}
async function parseExcelFileToRows(file) {
  const XLSX = await ensureXLSXLoaded();
  const data = new Uint8Array(await file.arrayBuffer());
  const wb = XLSX.read(data, { type: "array" });
  const firstSheetName = wb.SheetNames[0] || "";
  const lower = firstSheetName.toLowerCase();
  if (lower.includes("analysis") || lower.includes("score")) {
    throw new Error(
      `Leftmost worksheet is "${firstSheetName}". This looks like the analysis-score tab. Move the RAW sheet to the left and retry.`
    );
  }
  const ws = wb.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
}
function convertRawRowsToPairs(rows) {
  const out = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    // merged cell like "8 I would enjoy working outdoors"
    let merged = null;
    for (const cell of [row[0], row[1]]) {
      const s = String(cell ?? "");
      const m = s.match(/^\s*(-?\d+(?:\.\d+)?)\s+(.{6,})$/);
      if (m) {
        merged = { score: parseFloat(m[1]), text: m[2].trim() };
        break;
      }
    }
    if (merged) {
      out.push({ score: merged.score, statement: merged.text });
      continue;
    }

    const A = row[0],
      B = row[1],
      F = row[5];
    const aNum = Number(
      String(A ?? "")
        .toString()
        .replace(",", ".")
    );
    const fNum = Number(
      String(F ?? "")
        .toString()
        .replace(",", ".")
    );
    const Btxt = String(B ?? "").trim();
    const Atxt = String(A ?? "").trim();

    if (Number.isFinite(aNum) && Btxt.length >= 6) {
      out.push({ score: aNum, statement: Btxt });
      continue;
    }
    if (!Number.isFinite(aNum) && Number.isFinite(fNum) && Atxt.length >= 6) {
      out.push({ score: fNum, statement: Atxt });
      continue;
    }
  }
  const seen = new Set();
  const cleaned = [];
  for (const rec of out) {
    const text = rec.statement.replace(/\s+/g, " ").trim();
    const key = `${rec.score}|${text}`;
    if (!seen.has(key) && text.length >= 6) {
      cleaned.push({ score: rec.score, statement: text });
      seen.add(key);
    }
  }
  return cleaned;
}

/* ============================================
   UI Components
============================================ */
function SectionListNoBars({ title, sectionKey, data, twoColumns = false }) {
  const rows = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  return (
    <div
      className="panel row-avoid"
      style={{
        border: "1px solid #dfe3eb",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <div
        className="section-title"
        style={{ fontWeight: 700, marginBottom: 8 }}
      >
        {title}
      </div>
      <div style={twoColumns ? { columnCount: 2, columnGap: "24px" } : {}}>
        {rows.map(([name, v]) => (
          <div
            key={name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              breakInside: "avoid",
              marginBottom: 6,
            }}
          >
            <span>{name}</span>
            <span>{formatScore(sectionKey, v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryPanels({ scores }) {
  const traits = scores?.traits || {};
  const pairs = Object.entries(traits).filter(([_, v]) => Number.isFinite(v));
  const strengths = [...pairs].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const devAreas = [...pairs].sort((a, b) => a[1] - b[1]).slice(0, 5);
  return (
    <div
      className="row-avoid"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        marginBottom: 12,
      }}
    >
      <div
        className="panel"
        style={{ border: "1px solid #dfe3eb", borderRadius: 8, padding: 12 }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Top Strengths</div>
        {strengths.map(([k, v]) => (
          <div
            key={k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              marginBottom: 6,
            }}
          >
            <span>{k}</span>
            <span>{v.toFixed(1)}</span>
          </div>
        ))}
      </div>
      <div
        className="panel"
        style={{ border: "1px solid #dfe3eb", borderRadius: 8, padding: 12 }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Development Areas
        </div>
        {devAreas.map(([k, v]) => (
          <div
            key={k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              marginBottom: 6,
            }}
          >
            <span>{k}</span>
            <span>{v.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== Composite (clean), larger size, 2‑column layout support ===== */
function CompositeBox({ title, keys, traitScores }) {
  const [topKey, rightKey, bottomKey, leftKey] = keys;
  const topVal = Number(traitScores[topKey] ?? 0);
  const rightVal = Number(traitScores[rightKey] ?? 0);
  const bottomVal = Number(traitScores[bottomKey] ?? 0);
  const leftVal = Number(traitScores[leftKey] ?? 0);

  // Larger chart
  const W = 260,
    H = 260;
  const cx = W / 2,
    cy = H / 2;
  const pad = 24;
  const armMax = Math.min(W, H) / 2 - pad;
  const unit = armMax / 10;

  const ticks = Array.from({ length: 10 }, (_, i) => i + 1);
  const axisColor = "#c8cdd6";
  const armColor = "#1e88e5";

  return (
    <div
      className="panel"
      style={{ border: "1px solid #dfe3eb", borderRadius: 8, padding: 12 }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <svg width={W} height={H} style={{ display: "block", margin: "0 auto" }}>
        {/* Cross axes */}
        <line
          x1={cx}
          y1={12}
          x2={cx}
          y2={H - 12}
          stroke={axisColor}
          strokeWidth="1"
        />
        <line
          x1={12}
          y1={cy}
          x2={W - 12}
          y2={cy}
          stroke={axisColor}
          strokeWidth="1"
        />

        {/* Ticks */}
        {ticks.map((t) => {
          const dyUp = cy - t * unit;
          const dyDown = cy + t * unit;
          const dxRight = cx + t * unit;
          const dxLeft = cx - t * unit;
          return (
            <g key={t}>
              <line
                x1={cx - 4}
                y1={dyUp}
                x2={cx + 4}
                y2={dyUp}
                stroke={axisColor}
                strokeWidth="1"
              />
              <line
                x1={cx - 4}
                y1={dyDown}
                x2={cx + 4}
                y2={dyDown}
                stroke={axisColor}
                strokeWidth="1"
              />
              <line
                x1={dxRight}
                y1={cy - 4}
                x2={dxRight}
                y2={cy + 4}
                stroke={axisColor}
                strokeWidth="1"
              />
              <line
                x1={dxLeft}
                y1={cy - 4}
                x2={dxLeft}
                y2={cy + 4}
                stroke={axisColor}
                strokeWidth="1"
              />
            </g>
          );
        })}

        {/* Arms */}
        <line
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy - unit * topVal}
          stroke={armColor}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy - unit * topVal} r="3.8" fill={armColor} />
        <line
          x1={cx}
          y1={cy}
          x2={cx + unit * rightVal}
          y2={cy}
          stroke={armColor}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx={cx + unit * rightVal} cy={cy} r="3.8" fill={armColor} />
        <line
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy + unit * bottomVal}
          stroke={armColor}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy + unit * bottomVal} r="3.8" fill={armColor} />
        <line
          x1={cx}
          y1={cy}
          x2={cx - unit * leftVal}
          y2={cy}
          stroke={armColor}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx={cx - unit * leftVal} cy={cy} r="3.8" fill={armColor} />

        {/* Axis-end labels WITH values (slightly larger) */}
        <text
          x={cx}
          y={18}
          textAnchor="middle"
          fontSize="12"
          fill="#222"
        >{`${topKey} (${topVal.toFixed(1)})`}</text>
        <text
          x={W - 8}
          y={cy - 6}
          textAnchor="end"
          fontSize="12"
          fill="#222"
        >{`${rightKey} (${rightVal.toFixed(1)})`}</text>
        <text
          x={cx}
          y={H - 4}
          textAnchor="middle"
          fontSize="12"
          fill="#222"
        >{`${bottomKey} (${bottomVal.toFixed(1)})`}</text>
        <text
          x={8}
          y={cy - 6}
          textAnchor="start"
          fontSize="12"
          fill="#222"
        >{`${leftKey} (${leftVal.toFixed(1)})`}</text>
      </svg>
    </div>
  );
}

/* ============================================
   Main App
============================================ */
export default function App() {
  const [activeTab, setActiveTab] = useState("convert");
  const [candidateName, setCandidateName] = useState("");
  const [assessmentDate, setAssessmentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [csvText, setCsvText] = useState("");
  const [answers, setAnswers] = useState({});
  const [weightsJSONText, setWeightsJSONText] = useState("");

  useEffect(() => {
    setAnswers(parseCSV(csvText));
  }, [csvText]);

  const weights = useMemo(() => {
    try {
      return weightsJSONText ? JSON.parse(weightsJSONText) : undefined;
    } catch {
      return undefined;
    }
  }, [weightsJSONText]);

  const scores = useMemo(
    () => computeScores(answers, weights),
    [answers, weights]
  );
  const traitScores = scores?.traits || {};
  const hasAnyScore = Object.values(scores || {}).some(
    (section) => section && Object.keys(section).length > 0
  );

  function acceptConvertedPairs(pairs, sourceName = "converted") {
    const csv = toCSVFromPairs(pairs);
    setCsvText(csv);
    const safeCandidate = (candidateName || sourceName || "candidate").replace(
      /[\\/:*?"<>|]/g,
      "_"
    );
    downloadCSV(csv, `processed_${safeCandidate}.csv`);
    setActiveTab("report");
  }
  function resetAll() {
    setCandidateName("");
    setAssessmentDate(new Date().toISOString().slice(0, 10));
    setCsvText("");
    setAnswers({});
    setActiveTab("convert");
  }
  function clearWeights() {
    setWeightsJSONText("");
  }

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        padding: "24px",
        maxWidth: 1000,
        margin: "0 auto",
        background: "#fff",
      }}
    >
      {/* PRINT CSS */}
      <style>{`
        @media print {
          @page { size: A4; margin: 16mm 14mm 16mm 14mm; }
          .print-stack .page:not(:last-child) { break-after: page; }
          .panel, .row-avoid { break-inside: avoid; page-break-inside: avoid; }
          .no-print { display: none !important; }
          .tickbar { display: none !important; }
          .tickbar-composite { display: block !important; }
          .page-compact { font-size: 12px; }
          .page-compact .panel { padding: 10px !important; }
          .page-compact .section-title { font-size: 13px !important; margin-bottom: 6px !important; }
          .page-compact .row-avoid { margin-bottom: 2px !important; }
          .page-compact .grid-2x2 { gap: 10px !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Tabs */}
      <div
        className="no-print"
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        {[
          ["convert", "Input candidate Excel HI"],
          ["input", "Processed CSV"],
          ["report", "Report Preview"],
          ["weights", "Model Weights"],
        ].map(([t, label]) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              padding: "8px 16px",
              border: "1px solid #ccc",
              borderRadius: 6,
              background: activeTab === t ? "#004b8d" : "#f9f9f9",
              color: activeTab === t ? "#fff" : "#000",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Converter */}
      {activeTab === "convert" && (
        <div
          className="no-print"
          style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}
        >
          <h3>Candidate details</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 180px",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <input
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Name of person assessed"
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ccc",
                borderRadius: 8,
              }}
            />
            <input
              type="date"
              value={assessmentDate}
              onChange={(e) => setAssessmentDate(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ccc",
                borderRadius: 8,
              }}
            />
          </div>

          <h3>Upload & convert (Excel or CSV)</h3>
          <p style={{ marginTop: -6, color: "#555" }}>
            Upload a candidate&apos;s complete HI Excel sheet{" "}
            <b>(.xlsx/.xls)</b> or <b>.csv</b> here. The app always uses the{" "}
            <b>leftmost worksheet</b>. If that sheet looks like{" "}
            <b>analysis-score</b>, the import is voided.
          </p>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  if (/\.(xlsx|xls)$/i.test(f.name)) {
                    const rows = await parseExcelFileToRows(f);
                    const pairs = convertRawRowsToPairs(rows);
                    if (!pairs.length) {
                      alert(
                        "No usable rows found in Excel. Ensure RAW sheet is leftmost."
                      );
                      return;
                    }
                    acceptConvertedPairs(pairs, f.name.replace(/\.[^.]+$/, ""));
                  } else {
                    const txt = await f.text();
                    const maybeProcessed = parseCSV(txt);
                    if (Object.keys(maybeProcessed).length > 5) {
                      setCsvText(txt);
                      setActiveTab("report");
                    } else {
                      const rows = txt
                        .replace(/\r/g, "")
                        .split("\n")
                        .map((line) => line.split(","));
                      const pairs = convertRawRowsToPairs(rows);
                      if (!pairs.length) {
                        alert(
                          "Couldn’t detect data in CSV. If it’s an Excel export, upload the .xlsx instead."
                        );
                        return;
                      }
                      acceptConvertedPairs(
                        pairs,
                        f.name.replace(/\.[^.]+$/, "")
                      );
                    }
                  }
                } catch (err) {
                  alert(err.message || String(err));
                }
              }}
            />
            <button
              onClick={() => {
                if (!csvText.trim()) {
                  alert("No processed CSV available yet.");
                  return;
                }
                const safeCandidate = (candidateName || "processed").replace(
                  /[\\/:*?"<>|]/g,
                  "_"
                );
                downloadCSV(csvText, `processed_${safeCandidate}.csv`);
              }}
              style={{
                padding: "6px 12px",
                border: "1px solid #ccc",
                borderRadius: 6,
              }}
            >
              Download Converted CSV
            </button>
            <button
              onClick={resetAll}
              style={{
                padding: "6px 12px",
                border: "1px solid #d33",
                color: "#d33",
                borderRadius: 6,
                background: "#fff",
              }}
              title="Clear candidate details and processed CSV"
            >
              Reset
            </button>
          </div>

          <div style={{ fontSize: 12, color: "#666" }}>
            After conversion, the processed CSV will auto-download and you’ll
            jump to Report.
          </div>
        </div>
      )}

      {/* Processed CSV */}
      {activeTab === "input" && (
        <div
          className="no-print"
          style={{
            background: "#fdfdfd",
            border: "1px solid #ccc",
            borderRadius: 6,
            padding: 16,
          }}
        >
          <h3>Processed CSV (two columns: score,statement)</h3>
          <textarea
            rows={10}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            style={{ width: "100%", fontFamily: "monospace" }}
            placeholder={
              'score,statement\n7,"I would enjoy working outdoors"\n...'
            }
          />
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button
              onClick={() => setActiveTab("report")}
              style={{
                padding: "6px 12px",
                border: "1px solid #ccc",
                borderRadius: 6,
              }}
            >
              Go to Report
            </button>
            <button
              onClick={() => {
                const safeCandidate = (candidateName || "processed").replace(
                  /[\\/:*?"<>|]/g,
                  "_"
                );
                downloadCSV(csvText || "", `processed_${safeCandidate}.csv`);
              }}
              style={{
                padding: "6px 12px",
                border: "1px solid #ccc",
                borderRadius: 6,
              }}
            >
              Download Processed CSV
            </button>
          </div>
        </div>
      )}

      {/* Report */}
      {activeTab === "report" && (
        <div className="print-stack page-compact">
          {/* Page 1 */}
          <div className="page">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>
                  RE Harrison-style Assessment Report —{" "}
                  {candidateName || "Candidate"}
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  Assessment date: {assessmentDate || "-"}
                </div>
              </div>
              <div className="no-print" style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() =>
                    downloadCSV(
                      scores,
                      `report_${(candidateName || "candidate").replace(
                        /[\\/:*?"<>|]/g,
                        "_"
                      )}.csv`
                    )
                  }
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                  }}
                >
                  Download CSV
                </button>
                <button
                  onClick={downloadPDF}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                  }}
                >
                  Download PDF
                </button>
              </div>
            </div>
            <SummaryPanels scores={scores} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginTop: 12,
              }}
            >
              <SectionListNoBars
                title="Behavioral Competencies"
                sectionKey="behavioral"
                data={scores.behavioral}
              />
              <SectionListNoBars
                title="Functions"
                sectionKey="functions"
                data={scores.functions}
              />
            </div>
          </div>

          {/* Page 2 */}
          <div className="page">
            <SectionListNoBars
              title="Traits"
              sectionKey="traits"
              data={scores.traits}
              twoColumns
            />
          </div>

          {/* Page 3 */}
          <div className="page">
            <SectionListNoBars
              title="Employment Expectations"
              sectionKey="expectations"
              data={scores.expectations}
            />
            <SectionListNoBars
              title="Task Preferences"
              sectionKey="taskPrefs"
              data={scores.taskPrefs}
            />
          </div>

          {/* Page 4 */}
          <div className="page">
            <SectionListNoBars
              title="Work Environment Preferences"
              sectionKey="workEnv"
              data={scores.workEnv}
            />
            <SectionListNoBars
              title="Interests"
              sectionKey="interests"
              data={scores.interests}
            />
          </div>

          {/* Page 5 — Composite page (2 columns, larger charts, wrapper border removed) */}
          <div className="page">
            <div style={{ padding: 12 }}>
              <div
                className="section-title"
                style={{ fontWeight: 700, marginBottom: 10 }}
              >
                Composite Charts
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                {Object.entries(COMPOSITES).map(([title, arr]) => (
                  <CompositeBox
                    key={title}
                    title={title}
                    keys={arr}
                    traitScores={traitScores}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weights */}
      {activeTab === "weights" && (
        <div
          className="no-print"
          style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}
        >
          <h3>Model Weights (JSON)</h3>
          <textarea
            rows={16}
            value={weightsJSONText}
            onChange={(e) => setWeightsJSONText(e.target.value)}
            style={{ width: "100%", fontFamily: "monospace" }}
            placeholder="Paste weights.json here"
          />
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button
              onClick={clearWeights}
              style={{
                padding: "6px 12px",
                border: "1px solid #d33",
                color: "#d33",
                borderRadius: 6,
                background: "#fff",
              }}
            >
              Clear Weights
            </button>
            <button
              onClick={() => setActiveTab("report")}
              style={{
                padding: "6px 12px",
                border: "1px solid #ccc",
                borderRadius: 6,
              }}
            >
              Preview with these weights
            </button>
          </div>
          {!hasAnyScore && (
            <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
              Tip: load a processed CSV (left tabs) so we can compute a report
              with these weights.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
