"use client"

import { motion } from 'framer-motion'
import { VennData } from '../types/visualizer'

const COLORS = ['#4f46e5', '#10b981', '#f59e0b']

interface Props { data: VennData }

function TwoSetVenn({ data }: Props) {
    const [a, b] = data.sets
    const overlap = data.overlaps[0] ?? []

    return (
        <div className="relative w-full" style={{ height: 260 }}>
            <svg width="100%" height="260" viewBox="0 0 400 260" className="absolute inset-0">
                <circle cx="155" cy="130" r="110" fill={COLORS[0]} fillOpacity={0.12} stroke={COLORS[0]} strokeWidth={2} />
                <circle cx="245" cy="130" r="110" fill={COLORS[1]} fillOpacity={0.12} stroke={COLORS[1]} strokeWidth={2} />
            </svg>
            {/* Left only */}
            <div className="absolute text-center" style={{ left: '4%', top: '50%', transform: 'translateY(-50%)', width: '26%' }}>
                <p className="text-xs font-bold mb-1" style={{ color: COLORS[0] }}>{a.label}</p>
                {a.items.map((item, i) => <p key={i} className="text-[10px] text-zinc-300">{item}</p>)}
            </div>
            {/* Overlap */}
            <div className="absolute text-center" style={{ left: '37%', top: '50%', transform: 'translateY(-50%)', width: '26%' }}>
                {overlap.map((item, i) => <p key={i} className="text-[10px] text-zinc-200 font-medium">{item}</p>)}
            </div>
            {/* Right only */}
            <div className="absolute text-center" style={{ right: '4%', top: '50%', transform: 'translateY(-50%)', width: '26%' }}>
                <p className="text-xs font-bold mb-1" style={{ color: COLORS[1] }}>{b.label}</p>
                {b.items.map((item, i) => <p key={i} className="text-[10px] text-zinc-300">{item}</p>)}
            </div>
        </div>
    )
}

function ThreeSetVenn({ data }: Props) {
    const [a, b, c] = data.sets
    const [ab, ac, bc, abc] = [data.overlaps[0] ?? [], data.overlaps[1] ?? [], data.overlaps[2] ?? [], data.overlaps[3] ?? []]

    return (
        <div className="relative w-full" style={{ height: 300 }}>
            <svg width="100%" height="300" viewBox="0 0 400 300" className="absolute inset-0">
                <circle cx="200" cy="110" r="100" fill={COLORS[0]} fillOpacity={0.12} stroke={COLORS[0]} strokeWidth={2} />
                <circle cx="145" cy="205" r="100" fill={COLORS[1]} fillOpacity={0.12} stroke={COLORS[1]} strokeWidth={2} />
                <circle cx="255" cy="205" r="100" fill={COLORS[2]} fillOpacity={0.12} stroke={COLORS[2]} strokeWidth={2} />
            </svg>
            {/* Labels */}
            <div className="absolute text-center" style={{ left: '44%', top: '2%', transform: 'translateX(-50%)' }}>
                <p className="text-xs font-bold" style={{ color: COLORS[0] }}>{a.label}</p>
                {a.items.map((item, i) => <p key={i} className="text-[10px] text-zinc-300">{item}</p>)}
            </div>
            <div className="absolute text-center" style={{ left: '8%', bottom: '8%' }}>
                <p className="text-xs font-bold" style={{ color: COLORS[1] }}>{b.label}</p>
                {b.items.map((item, i) => <p key={i} className="text-[10px] text-zinc-300">{item}</p>)}
            </div>
            <div className="absolute text-center" style={{ right: '8%', bottom: '8%' }}>
                <p className="text-xs font-bold" style={{ color: COLORS[2] }}>{c.label}</p>
                {c.items.map((item, i) => <p key={i} className="text-[10px] text-zinc-300">{item}</p>)}
            </div>
            {/* Center */}
            <div className="absolute text-center" style={{ left: '50%', top: '52%', transform: 'translate(-50%,-50%)' }}>
                {abc.map((item, i) => <p key={i} className="text-[10px] text-zinc-100 font-semibold">{item}</p>)}
            </div>
            {/* AB overlap */}
            <div className="absolute text-center" style={{ left: '44%', top: '38%', transform: 'translateX(-50%)' }}>
                {ab.map((item, i) => <p key={i} className="text-[10px] text-zinc-200">{item}</p>)}
            </div>
            {/* AC overlap */}
            <div className="absolute text-center" style={{ left: '30%', top: '62%', transform: 'translateX(-50%)' }}>
                {ac.map((item, i) => <p key={i} className="text-[10px] text-zinc-200">{item}</p>)}
            </div>
            {/* BC overlap */}
            <div className="absolute text-center" style={{ left: '60%', top: '62%', transform: 'translateX(-50%)' }}>
                {bc.map((item, i) => <p key={i} className="text-[10px] text-zinc-200">{item}</p>)}
            </div>
        </div>
    )
}

export default function Venn({ data }: Props) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full p-4"
        >
            {data.sets.length === 3 ? <ThreeSetVenn data={data} /> : <TwoSetVenn data={data} />}
            {data.caption && <p className="mt-2 text-xs text-zinc-500 text-center">{data.caption}</p>}
        </motion.div>
    )
}
