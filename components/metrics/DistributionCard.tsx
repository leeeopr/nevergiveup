'use client'

import { MetricCard } from './MetricCard'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface DistributionCardProps {
  data: { name: string; value: number; color: string }[]
}

export function DistributionCard({ data }: DistributionCardProps) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0)

  return (
    <MetricCard delay={0.4}>
      <p className="text-[10px] text-silver-brushed/30 font-black uppercase tracking-[0.3em] mb-6">Alocação de Recursos</p>
      
      {/* Immersive stacked bar indicator with gaps and wood accents */}
      <div className="flex h-10 bg-velvet-deep/50 rounded-2xl overflow-hidden mb-8 silver-border p-1 gap-1">
        {data.map((item, idx) => (
          <div 
            key={idx}
            className="h-full rounded-lg transition-all duration-700 ease-out"
            style={{ 
              width: `${(item.value / total) * 100}%`,
              backgroundColor: item.color,
              opacity: 0.8
            }}
            title={item.name}
          />
        ))}
      </div>

      <div className="space-y-1">
        {data.map((item) => (
          <div key={item.name} className="flex justify-between items-center py-4 border-b border-silver-brushed/5 last:border-0 group">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-6 rounded-full opacity-60 transition-all group-hover:opacity-100" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-silver-brushed/60 font-black uppercase tracking-widest">{item.name}</span>
            </div>
            <div className="text-right">
               <span className="text-sm font-black text-silver-polished tracking-tighter">
                {((item.value / total) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </MetricCard>
  )
}
