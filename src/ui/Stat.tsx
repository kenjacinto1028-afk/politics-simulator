export function Stat({ label, value, good = true, wide = false }: { label: string; value: number; good?: boolean; wide?: boolean }) {
  const v = Math.round(value);
  const tone = (good ? v : 100 - v) >= 55 ? 'up' : (good ? v : 100 - v) <= 40 ? 'down' : '';
  return (
    <div className={`stat${wide ? ' wide' : ''}`}>
      <span className="muted">{label}</span>
      <div className="bar"><div className={`fill ${tone}`} style={{ width: `${v}%` }} /></div>
      <span>{v}</span>
    </div>
  );
}
