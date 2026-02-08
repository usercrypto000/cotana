import { PublicTrackerShell } from "@/app/_components/PublicTrackerShell";

export const dynamic = "force-static";

export default function MethodologyPage() {
  return (
    <PublicTrackerShell
      activeNav="methodology"
      title="Detection Methodology"
      subtitle="Evidence-first behavior scoring for incident classification and confidence evolution."
    >
      <section className="ht-panel">
        <h2 style={{ marginTop: 0 }}>What Cotana Detects</h2>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
          <li>Wallet drainer behavior and abnormal outflow patterns.</li>
          <li>Protocol exploit signatures from contract balance deltas and method anomalies.</li>
          <li>Bridge exploit markers including unbacked mint and liquidity cliff behavior.</li>
        </ul>
      </section>

      <section className="ht-panel alt">
        <h2 style={{ marginTop: 0 }}>What Cotana Does Not Detect</h2>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
          <li>No private off-chain intelligence or non-public incident feeds.</li>
          <li>No protocol-specific hardcoded exploit labels.</li>
          <li>No manual human narrative injection in generated summaries.</li>
          <li>No certainty guarantees; confidence depends on visible on-chain evidence quality.</li>
        </ul>
      </section>

      <section className="ht-panel">
        <h2 style={{ marginTop: 0 }}>Confidence Scoring</h2>
        <p style={{ marginTop: 0, lineHeight: 1.7 }}>
          Confidence is behavior-derived from independent rule hits, interaction weighting between
          correlated vectors, and lifecycle updates over time. Scores rise when multiple high-signal
          vectors align in the same window and actor graph.
        </p>
        <p style={{ marginBottom: 0, lineHeight: 1.7 }}>
          Summaries and timelines are generated deterministically from stored incident data and link
          directly to supporting on-chain evidence.
        </p>
      </section>
    </PublicTrackerShell>
  );
}
