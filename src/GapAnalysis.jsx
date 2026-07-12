import React, { useState, useMemo, useCallback } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  ShieldCheck, ShieldAlert, ShieldX, MinusCircle, Sparkles, Printer,
  ClipboardList, LayoutDashboard, ChevronDown, Loader2, AlertTriangle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const CRITICALITY_WEIGHT = { Critical: 4, High: 3, Medium: 2, Low: 1 };

const CONTROLS = [
  { id: "AC-01", category: "Access Control", title: "Multi-Factor Authentication", description: "MFA is enforced for all privileged and remote-access accounts.", criticality: "Critical" },
  { id: "AC-02", category: "Access Control", title: "Least Privilege & Role-Based Access", description: "Access rights are assigned by role and reviewed on a regular cadence.", criticality: "High" },
  { id: "DP-01", category: "Data Protection", title: "Encryption at Rest & in Transit", description: "Sensitive data is encrypted using approved algorithms, both stored and in motion.", criticality: "Critical" },
  { id: "DP-02", category: "Data Protection", title: "Backup & Recovery", description: "Data is backed up on a defined schedule and restore procedures are tested.", criticality: "High" },
  { id: "NS-01", category: "Network Security", title: "Firewall & Segmentation", description: "Network zones are segmented and perimeter firewalls enforce least-access rules.", criticality: "High" },
  { id: "NS-02", category: "Network Security", title: "Intrusion Detection / Prevention", description: "IDS/IPS monitors traffic for known attack patterns and anomalies.", criticality: "Medium" },
  { id: "IR-01", category: "Incident Response", title: "Documented IR Plan", description: "A written incident response plan defines roles, escalation, and containment steps.", criticality: "Critical" },
  { id: "IR-02", category: "Incident Response", title: "Response Drills", description: "Tabletop exercises or simulations are run at least annually.", criticality: "Medium" },
  { id: "LM-01", category: "Logging & Monitoring", title: "Centralized Logging (SIEM)", description: "Security-relevant logs are aggregated and retained for analysis and audit.", criticality: "High" },
  { id: "CM-01", category: "Change Management", title: "Formal Change Approval", description: "System and infrastructure changes go through documented review and approval.", criticality: "Medium" },
  { id: "VM-01", category: "Vendor Management", title: "Third-Party Risk Assessment", description: "Vendors with data or system access are assessed before onboarding and periodically after.", criticality: "Medium" },
  { id: "SA-01", category: "Security Awareness", title: "Employee Training Program", description: "Staff complete periodic security awareness and phishing-resilience training.", criticality: "Low" },
  { id: "PH-01", category: "Physical Security", title: "Facility Access Control", description: "Physical access to facilities and equipment is restricted and logged.", criticality: "Low" },
];

const CATEGORY_ORDER = [...new Set(CONTROLS.map((c) => c.category))];

/* ------------------------------------------------------------------ */
/*  HELPERS                                                             */
/* ------------------------------------------------------------------ */

const STATUS_FACTOR = { yes: 0, partial: 0.5, no: 1 };

function riskLevel(score) {
  if (score >= 76) return { label: "Critical", cls: "lvl-critical" };
  if (score >= 51) return { label: "High", cls: "lvl-high" };
  if (score >= 26) return { label: "Medium", cls: "lvl-medium" };
  return { label: "Low", cls: "lvl-low" };
}

function stripFences(text) {
  return text.replace(/```json|```/g, "").trim();
}

/* ------------------------------------------------------------------ */
/*  SMALL UI PIECES                                                    */
/* ------------------------------------------------------------------ */

function Stamp({ status }) {
  const map = {
    yes: { text: "PASS", cls: "stamp-pass", Icon: ShieldCheck },
    partial: { text: "PARTIAL", cls: "stamp-partial", Icon: ShieldAlert },
    no: { text: "GAP", cls: "stamp-gap", Icon: ShieldX },
    null: { text: "PENDING", cls: "stamp-pending", Icon: MinusCircle },
  };
  const s = map[status ?? "null"];
  return (
    <span className={`stamp ${s.cls}`}>
      <s.Icon size={13} strokeWidth={2.5} />
      {s.text}
    </span>
  );
}

function CriticalityTag({ level }) {
  return <span className={`crit-tag crit-${level.toLowerCase()}`}>{level}</span>;
}

/* ------------------------------------------------------------------ */
/*  CONTROL ROW                                                        */
/* ------------------------------------------------------------------ */

function ControlRow({ control, response, onChange, recommendation, aiLoading }) {
  const [open, setOpen] = useState(false);
  const isGap = response.status === "no" || response.status === "partial";

  return (
    <div className="control-row">
      <div className="control-row-main">
        <div className="control-id">{control.id}</div>

        <div className="control-body">
          <div className="control-title-line">
            <span className="control-title">{control.title}</span>
            <CriticalityTag level={control.criticality} />
          </div>
          <p className="control-desc">{control.description}</p>
        </div>

        <div className="control-actions">
          {["yes", "partial", "no"].map((v) => (
            <button
              key={v}
              className={`status-btn status-${v} ${response.status === v ? "active" : ""}`}
              onClick={() => onChange(control.id, { ...response, status: v })}
            >
              {v === "yes" ? "Yes" : v === "partial" ? "Partial" : "No"}
            </button>
          ))}
        </div>

        <Stamp status={response.status} />

        <button className="notes-toggle" onClick={() => setOpen((o) => !o)} aria-label="Toggle notes">
          <ChevronDown size={16} className={open ? "rot" : ""} />
        </button>
      </div>

      {open && (
        <div className="notes-panel">
          <textarea
            placeholder="Evaluator notes (evidence reviewed, context, exceptions)..."
            value={response.notes}
            onChange={(e) => onChange(control.id, { ...response, notes: e.target.value })}
          />
        </div>
      )}

      {isGap && (
        <div className="rec-box">
          <div className="rec-label"><Sparkles size={13} /> AI Recommendation</div>
          {aiLoading ? (
            <div className="rec-loading"><Loader2 size={13} className="spin" /> generating…</div>
          ) : recommendation ? (
            <p className="rec-text">{recommendation}</p>
          ) : (
            <p className="rec-text muted">Not yet generated — run "Generate AI Recommendations" from the dashboard.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DASHBOARD                                                          */
/* ------------------------------------------------------------------ */

function Dashboard({ controls, responses, stats, onGenerateAI, aiBusy, recommendations }) {
  const pieData = [
    { name: "Pass", value: stats.passCount, color: "#4FA89C" },
    { name: "Partial", value: stats.partialCount, color: "#E0A840" },
    { name: "Gap", value: stats.gapCount, color: "#D9584F" },
    { name: "Pending", value: stats.pendingCount, color: "#3A4557" },
  ].filter((d) => d.value > 0);

  const categoryRisk = CATEGORY_ORDER.map((cat) => {
    const inCat = controls.filter((c) => c.category === cat);
    let weightSum = 0, riskSum = 0;
    inCat.forEach((c) => {
      const r = responses[c.id];
      if (r.status) {
        const w = CRITICALITY_WEIGHT[c.criticality];
        weightSum += w;
        riskSum += w * STATUS_FACTOR[r.status];
      }
    });
    return { category: cat, risk: weightSum ? Math.round((riskSum / weightSum) * 100) : 0 };
  });

  const topGaps = controls
    .filter((c) => ["no", "partial"].includes(responses[c.id].status))
    .map((c) => ({
      ...c,
      score: CRITICALITY_WEIGHT[c.criticality] * STATUS_FACTOR[responses[c.id].status],
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const overall = riskLevel(stats.overallRisk);

  return (
    <div className="dash">
      <div className="dash-cards">
        <div className="card">
          <div className="card-label">Compliance Score</div>
          <div className="card-value">{stats.complianceScore}%</div>
          <div className="card-sub">{stats.assessedCount} / {controls.length} controls assessed</div>
        </div>
        <div className="card">
          <div className="card-label">Overall Risk</div>
          <div className={`card-value ${overall.cls}`}>{stats.assessedCount ? overall.label : "—"}</div>
          <div className="card-sub">{stats.assessedCount ? `${stats.overallRisk}% weighted risk` : "no data yet"}</div>
        </div>
        <div className="card">
          <div className="card-label">Gaps Identified</div>
          <div className="card-value gap-num">{stats.gapCount + stats.partialCount}</div>
          <div className="card-sub">{stats.gapCount} full · {stats.partialCount} partial</div>
        </div>
        <div className="card">
          <div className="card-label">Controls Pending</div>
          <div className="card-value">{stats.pendingCount}</div>
          <div className="card-sub">not yet evaluated</div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="panel">
          <div className="panel-title">Status Breakdown</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1E2530", border: "1px solid #2A3341", borderRadius: 8, color: "#E8E6DF" }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#8B93A1" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <div className="panel-title">Risk by Category</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryRisk} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A3341" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "#8B93A1", fontSize: 11 }} />
              <YAxis type="category" dataKey="category" width={130} tick={{ fill: "#8B93A1", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1E2530", border: "1px solid #2A3341", borderRadius: 8, color: "#E8E6DF" }} />
              <Bar dataKey="risk" radius={[0, 4, 4, 0]}>
                {categoryRisk.map((d, i) => (
                  <Cell key={i} fill={d.risk >= 51 ? "#D9584F" : d.risk >= 26 ? "#E0A840" : "#4FA89C"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title-row">
          <div className="panel-title">Highest-Priority Gaps</div>
          <button className="ai-btn" onClick={onGenerateAI} disabled={aiBusy || topGaps.length === 0}>
            {aiBusy ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
            {aiBusy ? "Generating…" : "Generate AI Recommendations"}
          </button>
        </div>
        {topGaps.length === 0 ? (
          <p className="empty-note">No gaps identified yet — evaluate controls in the checklist tab.</p>
        ) : (
          <div className="gap-list">
            {topGaps.map((g) => (
              <div key={g.id} className="gap-item">
                <div className="gap-item-head">
                  <span className="control-id">{g.id}</span>
                  <span className="control-title">{g.title}</span>
                  <CriticalityTag level={g.criticality} />
                  <Stamp status={responses[g.id].status} />
                </div>
                <p className="rec-text">
                  {recommendations[g.id] ?? <span className="muted">No AI recommendation generated yet.</span>}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN APP                                                           */
/* ------------------------------------------------------------------ */

export default function GapAnalysisApp() {
  const [tab, setTab] = useState("checklist");
  const [responses, setResponses] = useState(() =>
    Object.fromEntries(CONTROLS.map((c) => [c.id, { status: null, notes: "" }]))
  );
  const [recommendations, setRecommendations] = useState({});
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState(null);

  const handleChange = useCallback((id, next) => {
    setResponses((prev) => ({ ...prev, [id]: next }));
  }, []);

  const stats = useMemo(() => {
    let passCount = 0, partialCount = 0, gapCount = 0, pendingCount = 0;
    let weightSum = 0, riskSum = 0, complianceWeighted = 0;

    CONTROLS.forEach((c) => {
      const r = responses[c.id];
      if (r.status === "yes") { passCount++; complianceWeighted += 1; }
      else if (r.status === "partial") { partialCount++; complianceWeighted += 0.5; }
      else if (r.status === "no") { gapCount++; }
      else pendingCount++;

      if (r.status) {
        const w = CRITICALITY_WEIGHT[c.criticality];
        weightSum += w;
        riskSum += w * STATUS_FACTOR[r.status];
      }
    });

    const assessedCount = CONTROLS.length - pendingCount;
    const complianceScore = Math.round((complianceWeighted / CONTROLS.length) * 100);
    const overallRisk = weightSum ? Math.round((riskSum / weightSum) * 100) : 0;

    return { passCount, partialCount, gapCount, pendingCount, assessedCount, complianceScore, overallRisk };
  }, [responses]);

  const generateRecommendations = useCallback(async () => {
    const gaps = CONTROLS.filter((c) => ["no", "partial"].includes(responses[c.id].status));
    if (gaps.length === 0) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const payload = gaps.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        description: c.description,
        criticality: c.criticality,
        status: responses[c.id].status,
        notes: responses[c.id].notes || null,
      }));

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content:
                "You are a cybersecurity compliance consultant. For each control gap below, write one concise, actionable remediation recommendation (max 2 sentences, practical and specific).\n\n" +
                "Respond with ONLY a JSON array, no markdown fences, no preamble, in this exact shape:\n" +
                '[{"id": "AC-01", "recommendation": "..."}]\n\n' +
                "Gaps:\n" + JSON.stringify(payload, null, 2),
            },
          ],
        }),
      });

      const data = await response.json();
      const textBlock = (data.content || []).find((b) => b.type === "text");
      const parsed = JSON.parse(stripFences(textBlock?.text || "[]"));

      const next = {};
      parsed.forEach((item) => { if (item.id && item.recommendation) next[item.id] = item.recommendation; });
      setRecommendations((prev) => ({ ...prev, ...next }));
    } catch (err) {
      setAiError("Couldn't generate recommendations right now. Please try again.");
    } finally {
      setAiBusy(false);
    }
  }, [responses]);

  const handlePrint = () => window.print();

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

        * { box-sizing: border-box; }
        .app {
          --bg: #10141A;
          --panel: #171D26;
          --panel-alt: #1C2430;
          --border: #2A3341;
          --text: #E8E6DF;
          --muted: #8B93A1;
          --pass: #4FA89C;
          --partial: #E0A840;
          --gap: #D9584F;
          --pending: #4B5568;
          background: var(--bg);
          color: var(--text);
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          padding: 28px 20px 60px;
        }
        .mono { font-family: 'JetBrains Mono', monospace; }

        .header {
          display: flex; align-items: flex-start; justify-content: space-between;
          max-width: 980px; margin: 0 auto 22px; flex-wrap: wrap; gap: 14px;
          border-bottom: 1px solid var(--border); padding-bottom: 18px;
        }
        .header-title { font-family: 'Space Grotesk', sans-serif; }
        .eyebrow {
          font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.12em;
          color: var(--partial); text-transform: uppercase; margin-bottom: 4px;
        }
        .header-title h1 { font-size: 24px; font-weight: 700; margin: 0; }
        .header-title p { font-size: 13px; color: var(--muted); margin: 4px 0 0; }

        .header-actions { display: flex; gap: 8px; align-items: center; }
        .tab-group { display: flex; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 3px; }
        .tab-btn {
          display: flex; align-items: center; gap: 6px; padding: 7px 13px; border: none; background: transparent;
          color: var(--muted); font-size: 13px; font-weight: 500; border-radius: 6px; cursor: pointer; font-family: 'Inter', sans-serif;
        }
        .tab-btn.active { background: var(--panel-alt); color: var(--text); }
        .print-btn {
          display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px;
          border: 1px solid var(--border); background: var(--panel); color: var(--text); font-size: 13px;
          cursor: pointer; font-family: 'Inter', sans-serif;
        }
        .print-btn:hover { border-color: var(--partial); }

        .main { max-width: 980px; margin: 0 auto; }

        /* ---- category / control rows ---- */
        .category-block { margin-bottom: 22px; }
        .category-head {
          display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
          font-family: 'Space Grotesk', sans-serif; font-size: 13px; letter-spacing: 0.05em;
          color: var(--muted); text-transform: uppercase;
        }
        .category-head::after { content: ""; flex: 1; height: 1px; background: var(--border); }

        .control-row {
          background: var(--panel); border: 1px solid var(--border); border-radius: 10px;
          margin-bottom: 8px; padding: 12px 14px;
        }
        .control-row-main { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .control-id { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--partial); width: 48px; flex-shrink: 0; }
        .control-body { flex: 1; min-width: 220px; }
        .control-title-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .control-title { font-weight: 600; font-size: 14px; }
        .control-desc { font-size: 12.5px; color: var(--muted); margin: 3px 0 0; line-height: 1.4; }

        .crit-tag {
          font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.04em;
          padding: 2px 7px; border-radius: 999px; text-transform: uppercase; border: 1px solid;
        }
        .crit-critical { color: #F0918A; border-color: #6B2E2B; background: #2A1817; }
        .crit-high { color: #F0C27F; border-color: #6B4E1F; background: #2A2114; }
        .crit-medium { color: #E8D98A; border-color: #5C5A28; background: #26241A; }
        .crit-low { color: #9FD1CB; border-color: #285A54; background: #14231F; }

        .control-actions { display: flex; gap: 6px; }
        .status-btn {
          font-size: 12px; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border);
          background: var(--panel-alt); color: var(--muted); cursor: pointer; font-family: 'Inter', sans-serif; font-weight: 500;
        }
        .status-btn.status-yes.active { background: #17332F; color: var(--pass); border-color: var(--pass); }
        .status-btn.status-partial.active { background: #332913; color: var(--partial); border-color: var(--partial); }
        .status-btn.status-no.active { background: #331B18; color: var(--gap); border-color: var(--gap); }

        .stamp {
          font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: 0.08em;
          display: inline-flex; align-items: center; gap: 4px; padding: 4px 9px; border-radius: 5px;
          border: 1px dashed; transform: rotate(-1.5deg); font-weight: 600;
        }
        .stamp-pass { color: var(--pass); border-color: var(--pass); }
        .stamp-partial { color: var(--partial); border-color: var(--partial); }
        .stamp-gap { color: var(--gap); border-color: var(--gap); }
        .stamp-pending { color: var(--muted); border-color: var(--pending); }

        .notes-toggle { background: none; border: none; color: var(--muted); cursor: pointer; padding: 4px; }
        .notes-toggle .rot { transform: rotate(180deg); }
        .notes-panel { margin-top: 10px; }
        .notes-panel textarea {
          width: 100%; min-height: 56px; background: var(--panel-alt); border: 1px solid var(--border);
          border-radius: 6px; color: var(--text); font-size: 12.5px; padding: 8px 10px; font-family: 'Inter', sans-serif; resize: vertical;
        }

        .rec-box { margin-top: 10px; padding: 10px 12px; background: #1A1710; border: 1px solid #3D3218; border-radius: 8px; }
        .rec-label { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--partial); font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
        .rec-text { font-size: 12.5px; color: var(--text); line-height: 1.5; margin: 0; }
        .rec-text.muted, .muted { color: var(--muted); font-style: italic; }
        .rec-loading { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 6px; }

        /* ---- dashboard ---- */
        .dash-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
        .card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
        .card-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .card-value { font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 700; margin-top: 4px; }
        .card-value.gap-num { color: var(--gap); }
        .card-sub { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
        .lvl-low { color: var(--pass); } .lvl-medium { color: var(--partial); }
        .lvl-high { color: #E37A5B; } .lvl-critical { color: var(--gap); }

        .dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
        .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin-bottom: 12px; }
        .panel-title { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 600; margin-bottom: 10px; }
        .panel-title-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }

        .ai-btn {
          display: flex; align-items: center; gap: 6px; background: linear-gradient(135deg,#3D3218,#4A3B18);
          border: 1px solid #5C4A1F; color: var(--partial); font-size: 12.5px; font-weight: 600;
          padding: 7px 13px; border-radius: 7px; cursor: pointer; font-family: 'Inter', sans-serif;
        }
        .ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .gap-list { display: flex; flex-direction: column; gap: 10px; }
        .gap-item { background: var(--panel-alt); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; }
        .gap-item-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
        .empty-note { font-size: 13px; color: var(--muted); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .ai-error { max-width: 980px; margin: 0 auto 14px; color: var(--gap); font-size: 12.5px; display: flex; align-items: center; gap: 6px; }

        @media (max-width: 720px) {
          .dash-cards { grid-template-columns: 1fr 1fr; }
          .dash-grid { grid-template-columns: 1fr; }
          .control-row-main { flex-direction: column; align-items: flex-start; }
        }

        @media print {
          .app { background: #fff !important; color: #111 !important; padding: 10px; }
          .no-print { display: none !important; }
          .control-row, .panel, .card { background: #fff !important; border: 1px solid #ccc !important; break-inside: avoid; }
          .card-value, .control-title, .panel-title { color: #111 !important; }
          .control-desc, .card-sub, .muted { color: #555 !important; }
          .rec-box { background: #fdf6e3 !important; border-color: #d8c48a !important; }
        }
      `}</style>

      <div className="header">
        <div className="header-title">
          <div className="eyebrow">Compliance Ledger</div>
          <h1>Cybersecurity Control Gap Analysis</h1>
          <p>{CONTROLS.length} baseline controls · manual evaluation · risk-weighted scoring</p>
        </div>
        <div className="header-actions no-print">
          <div className="tab-group">
            <button className={`tab-btn ${tab === "checklist" ? "active" : ""}`} onClick={() => setTab("checklist")}>
              <ClipboardList size={14} /> Checklist
            </button>
            <button className={`tab-btn ${tab === "dashboard" ? "active" : ""}`} onClick={() => setTab("dashboard")}>
              <LayoutDashboard size={14} /> Dashboard
            </button>
          </div>
          <button className="print-btn" onClick={handlePrint}>
            <Printer size={14} /> Export Report
          </button>
        </div>
      </div>

      {aiError && <div className="ai-error"><AlertTriangle size={13} /> {aiError}</div>}

      <div className="main">
        {tab === "checklist" ? (
          CATEGORY_ORDER.map((cat, i) => (
            <div className="category-block" key={cat}>
              <div className="category-head">{String(i + 1).padStart(2, "0")} — {cat}</div>
              {CONTROLS.filter((c) => c.category === cat).map((c) => (
                <ControlRow
                  key={c.id}
                  control={c}
                  response={responses[c.id]}
                  onChange={handleChange}
                  recommendation={recommendations[c.id]}
                  aiLoading={aiBusy && ["no", "partial"].includes(responses[c.id].status) && !recommendations[c.id]}
                />
              ))}
            </div>
          ))
        ) : (
          <Dashboard
            controls={CONTROLS}
            responses={responses}
            stats={stats}
            onGenerateAI={generateRecommendations}
            aiBusy={aiBusy}
            recommendations={recommendations}
          />
        )}
      </div>
    </div>
  );
}
