"use client";

type ClueListProps = { rules: string[] };

// The clue parchment — read-only list of this round's rule sentences,
// including compound/conditional ones, shown verbatim.
export function ClueList({ rules }: ClueListProps) {
  return (
    <div style={plateStyle}>
      {rules.map((rule, i) => (
        <div key={i} style={ruleRowStyle}>
          <span aria-hidden style={bulletStyle}>
            ✦
          </span>
          <span>{rule}</span>
        </div>
      ))}
    </div>
  );
}

const plateStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: "12px 14px",
  borderRadius: 16,
  background: "rgba(10,8,20,0.82)",
  border: "1px solid rgba(240,166,60,0.35)",
  boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
};

const ruleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  fontSize: 12.5,
  lineHeight: 1.4,
  fontWeight: 600,
  color: "var(--color-soft)",
};

const bulletStyle: React.CSSProperties = {
  color: "#F0C572",
  fontSize: 11,
  marginTop: 1,
  flexShrink: 0,
};
