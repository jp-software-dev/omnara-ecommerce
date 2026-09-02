export function SimpleBarChart({
  data,
  formatValue,
}: {
  data: { label: string; value: number }[];
  formatValue: (value: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const width = 600;
  const height = 160;
  const barGap = 2;
  const barWidth = data.length > 0 ? width / data.length - barGap : 0;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-40 w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label={formatValue(data.reduce((sum, d) => sum + d.value, 0))}
    >
      {data.map((point, index) => {
        const barHeight = (point.value / max) * (height - 4);
        return (
          <rect
            key={point.label}
            x={index * (barWidth + barGap)}
            y={height - barHeight}
            width={Math.max(barWidth, 1)}
            height={barHeight}
            className={point.value > 0 ? "fill-primary" : "fill-muted"}
            rx={1}
          >
            <title>
              {point.label}: {formatValue(point.value)}
            </title>
          </rect>
        );
      })}
    </svg>
  );
}
