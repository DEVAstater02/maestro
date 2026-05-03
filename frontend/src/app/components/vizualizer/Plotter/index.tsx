"use client"

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { PlotterData } from '../types/visualizer'

interface Props { data: PlotterData }

export default function Plotter({ data }: Props) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!ref.current) return
        ref.current.innerHTML = ''

        import('function-plot').then(({ default: functionPlot }) => {
            try {
                functionPlot({
                    target: ref.current!,
                    width: ref.current!.clientWidth || 420,
                    height: 280,
                    xAxis: {
                        domain: data.x_range,
                        label: data.x_label,
                    },
                    yAxis: {
                        domain: data.y_range,
                        label: data.y_label,
                    },
                    grid: true,
                    data: data.functions.map(fn => ({
                        fn: fn.expression,
                        color: fn.color || '#4f46e5',
                        graphType: 'polyline',
                    })),
                })
            } catch (e) {
                if (ref.current) {
                    ref.current.innerHTML = '<p style="color:#a1a1aa;font-size:12px;padding:8px">Could not render plot.</p>'
                }
            }
        })
    }, [data])

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full p-4"
        >
            <div className="flex flex-wrap gap-3 mb-3">
                {data.functions.map((fn, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: fn.color || '#4f46e5' }} />
                        <span className="text-xs text-zinc-300 font-mono">{fn.label}</span>
                    </div>
                ))}
            </div>
            <div
                ref={ref}
                className="w-full rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900"
                style={{ minHeight: 280 }}
            />
        </motion.div>
    )
}
