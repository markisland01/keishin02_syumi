import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { RANK_THRESHOLDS } from '../utils/calculations';

const RANK_COLORS = {
  A: '#43A047',
  B: '#1E88E5',
  C: '#FB8C00',
  D: '#E53935',
};

export default function PScoreChart({ scores, targetP }) {
  const data = scores.map((s, i) => ({
    year: i === 0 ? '現在' : `${i}年後`,
    P点: s.p,
    X1点: s.x1,
    Y点: s.y,
    Z点: s.z,
  }));

  const minY = 500;
  const maxY = 960;

  function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;

    return (
      <div
        style={{
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 13,
        }}
      >
        <p style={{ fontWeight: 'bold', marginBottom: 6 }}>{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color, margin: '2px 0' }}>
            {p.name}: {p.value}点
          </p>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 10,
        padding: '16px 16px 8px',
        marginBottom: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
      }}
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 40, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

          <ReferenceArea y1={RANK_THRESHOLDS.A} y2={maxY} fill="#43A04715" />
          <ReferenceArea y1={RANK_THRESHOLDS.B} y2={RANK_THRESHOLDS.A} fill="#1E88E515" />
          <ReferenceArea y1={RANK_THRESHOLDS.C} y2={RANK_THRESHOLDS.B} fill="#FB8C0015" />
          <ReferenceArea y1={minY} y2={RANK_THRESHOLDS.C} fill="#E5393515" />

          <ReferenceLine
            y={RANK_THRESHOLDS.C}
            stroke={RANK_COLORS.C}
            strokeDasharray="6 3"
            label={{ value: 'C', position: 'right', fill: RANK_COLORS.C, fontWeight: 'bold' }}
          />
          <ReferenceLine
            y={RANK_THRESHOLDS.B}
            stroke={RANK_COLORS.B}
            strokeDasharray="6 3"
            label={{ value: 'B', position: 'right', fill: RANK_COLORS.B, fontWeight: 'bold' }}
          />
          <ReferenceLine
            y={RANK_THRESHOLDS.A}
            stroke={RANK_COLORS.A}
            strokeDasharray="6 3"
            label={{ value: 'A', position: 'right', fill: RANK_COLORS.A, fontWeight: 'bold' }}
          />

          {targetP && ![RANK_THRESHOLDS.A, RANK_THRESHOLDS.B, RANK_THRESHOLDS.C].includes(targetP) && (
            <ReferenceLine
              y={targetP}
              stroke="#D32F2F"
              strokeWidth={2}
              label={{
                value: `目標 ${targetP}点`,
                position: 'insideTopRight',
                fill: '#D32F2F',
                fontSize: 11,
                fontWeight: 'bold',
              }}
            />
          )}

          <XAxis dataKey="year" tick={{ fontSize: 13 }} />
          <YAxis domain={[minY, maxY]} tick={{ fontSize: 12 }} width={42} />
          <Tooltip content={<CustomTooltip />} />

          <Line
            type="monotone"
            dataKey="X1点"
            stroke="#1976D2"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="Y点"
            stroke="#388E3C"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="Z点"
            stroke="#7B1FA2"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="P点"
            stroke="#212121"
            strokeWidth={3}
            dot={{ r: 6, fill: '#212121' }}
            activeDot={{ r: 8 }}
          />

          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
        </LineChart>
      </ResponsiveContainer>

      <div
        style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          marginTop: 4,
          fontSize: 11,
          color: '#666',
        }}
      >
        {[['A', '900点以上'], ['B', '800〜899点'], ['C', '700〜799点'], ['D', '699点以下']].map(([r, label]) => (
          <span key={r}>
            <span style={{ color: RANK_COLORS[r], fontWeight: 'bold' }}>■</span> {r}ランク {label}
          </span>
        ))}
      </div>
    </div>
  );
}
