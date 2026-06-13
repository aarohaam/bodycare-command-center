interface KpiCardProps {
  label: string;
  value: string | number;
  tone?: "neutral" | "good" | "warning" | "danger";
}

export function KpiCard({ label, value, tone = "neutral" }: KpiCardProps) {
  return (
    <div className={`kpi-card kpi-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
