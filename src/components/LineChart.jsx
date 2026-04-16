// SVG inline line chart — sin librería externa
// data = [{ x: string, y: number }]
export default function LineChart({ data = [], height = 200, color = '#2f80ed' }) {
  if (!data || data.length < 2) {
    return <p style={{ color: '#6b7c98', fontSize: '0.9rem' }}>Sin datos para graficar.</p>
  }

  const W = 600
  const H = height
  const padL = 58
  const padR = 16
  const padT = 14
  const padB = 38

  const values = data.map((d) => d.y)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1

  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const toX = (i) => padL + (i / (data.length - 1)) * plotW
  const toY = (v) => padT + plotH - ((v - minVal) / range) * plotH

  // Puntos del polyline
  const pts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.y).toFixed(1)}`).join(' ')

  // Área de relleno
  const areaPath = [
    `M ${toX(0).toFixed(1)},${(padT + plotH).toFixed(1)}`,
    ...data.map((d, i) => `L ${toX(i).toFixed(1)},${toY(d.y).toFixed(1)}`),
    `L ${toX(data.length - 1).toFixed(1)},${(padT + plotH).toFixed(1)}`,
    'Z',
  ].join(' ')

  // Ticks Y (3 niveles)
  const yTicks = [0, 0.5, 1].map((t) => ({
    val: minVal + t * range,
    y: padT + plotH - t * plotH,
  }))

  // Ticks X (máx 6 etiquetas)
  const step = Math.max(1, Math.floor(data.length / 6))
  const xTicks = data
    .map((d, i) => ({ label: d.x, x: toX(i), i }))
    .filter((_, i) => i % step === 0 || i === data.length - 1)

  const gradId = `grad-${Math.random().toString(36).slice(2, 7)}`

  return (
    <div className="line-chart-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height, display: 'block' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Grid lines Y */}
        {yTicks.map(({ val, y }) => (
          <g key={val}>
            <line
              x1={padL} y1={y.toFixed(1)} x2={W - padR} y2={y.toFixed(1)}
              stroke="#e8eef7" strokeDasharray="4 3" strokeWidth="1"
            />
            <text
              x={(padL - 6).toFixed(1)} y={(y + 4).toFixed(1)}
              textAnchor="end"
              fontSize="10"
              fill="#7083a3"
            >
              ${Math.round(val).toLocaleString('en-US')}
            </text>
          </g>
        ))}

        {/* Área relleno */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Línea principal */}
        <polyline
          points={pts}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Puntos */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={toX(i).toFixed(1)}
            cy={toY(d.y).toFixed(1)}
            r="3.5"
            fill="#fff"
            stroke={color}
            strokeWidth="2"
          />
        ))}

        {/* Etiquetas X */}
        {xTicks.map(({ label, x }) => (
          <text
            key={label + x}
            x={x.toFixed(1)}
            y={(H - padB + 16).toFixed(1)}
            textAnchor="middle"
            fontSize="10"
            fill="#7083a3"
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  )
}
