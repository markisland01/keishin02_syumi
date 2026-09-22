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

export default function PScoreChart({ scores, baselineScores = [], activeYear = 0, onSelectYear, targetP, showComponents = false }) {
  const data = scores.map((s, i) => ({
    year: i === 0 ? '現在' : `${i}年後`,
    詳細P点: s.yDetail?.status === 'complete' ? s.p : null,
    参考P点: s.yDetail?.status === 'complete' ? null : s.p,
    計算状態: s.yDetail?.status === 'complete' ? '詳細計算' : s.p == null ? '未算定' : '参考推計・旧方式',
    X1点: s.x1,
    Y点: s.y,
    Z点: s.z,
    基準P点: baselineScores[i]?.p ?? null,
  }));

  const scoreValues = data.flatMap(item => [item.詳細P点, item.参考P点, item.基準P点]).filter(value => Number.isFinite(value));
  const minValue = scoreValues.length ? Math.min(...scoreValues, RANK_THRESHOLDS.C) : 500;
  const maxValue = scoreValues.length ? Math.max(...scoreValues, targetP || 0, RANK_THRESHOLDS.A) : 960;
  const minY = Math.max(0, Math.floor((minValue - 60) / 50) * 50);
  const maxY = Math.ceil((maxValue + 40) / 50) * 50;

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
        <p>{payload[0]?.payload.計算状態}</p>
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
      className="simulator-score-chart"
      style={{
        background: 'white',
        borderRadius: 10,
        padding: '16px 16px 8px',
        marginBottom: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
      }}
    >
      <div className="simulator-chart-plot">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 40, left: 0, bottom: 0 }}
          onClick={state => {
            const label = state?.activeLabel;
            const nextIndex = data.findIndex(item => item.year === label);
            if (nextIndex >= 0) onSelectYear?.(nextIndex);
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

          {data[activeYear] && (
            <ReferenceLine x={data[activeYear].year} stroke="#3949ab" strokeWidth={2} strokeOpacity={0.32} />
          )}

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

          <XAxis dataKey="year" interval="preserveStartEnd" tick={{ fontSize: 11 }} />
          <YAxis domain={[minY, maxY]} tick={{ fontSize: 12 }} width={42} />
          <Tooltip content={<CustomTooltip />} />

          {showComponents && <>
            <Line type="monotone" dataKey="X1点" stroke="#1976D2" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="Y点" stroke="#388E3C" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="Z点" stroke="#7B1FA2" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </>}
          <Line
            type="monotone"
            dataKey="詳細P点"
            stroke="#212121"
            strokeWidth={3}
            dot={{ r: 6, fill: '#212121' }}
            activeDot={{ r: 8 }}
          />
          <Line type="monotone" dataKey="参考P点" stroke="#666" strokeWidth={2} strokeDasharray="5 4" dot={{r:5,fill:'white'}} />
          <Line type="monotone" dataKey="基準P点" stroke="#9aa5bd" strokeWidth={1.5} strokeDasharray="2 4" dot={{ r: 3, fill: '#fff', stroke: '#9aa5bd' }} />

          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
        </LineChart>
      </ResponsiveContainer>
      </div>

      <div
        className="simulator-chart-rank-legend"
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
