"use client";

type ClueListProps = { rules: string[] };

// One separate parchment pill per rule — stacked with a visible gap
// between them, rather than bulleted lines inside a single dark plate —
// matching Lumosity Organic Order's own clue-card look.
export function ClueList({ rules }: ClueListProps) {
  return (
    <div style={plateStyle}>
      {rules.map((rule, i) => (
        <div key={i} style={ruleRowStyle}>
          {rule}
        </div>
      ))}
    </div>
  );
}

const plateStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 7,
};

const ruleRowStyle: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 18,
  background: "#F1ECDB",
  color: "#223420",
  fontSize: 12.5,
  lineHeight: 1.35,
  fontWeight: 700,
  boxShadow: "0 2px 0 rgba(0,0,0,0.16), 0 5px 12px rgba(0,0,0,0.3)",
};
