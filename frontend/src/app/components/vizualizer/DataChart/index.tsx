"use client"

import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { ChartData } from '../types/visualizer'

interface DataChartProps {
    data: ChartData
    height?: number
}

const COLORS = ['#1D9E75', '#378ADD', '#D85A30', '#BA7517', '#7F77DD', '#D4537E']

export default function DataChart({ data, height = 300 }: DataChartProps) {
    const { chartType, xKey, yKey, rows } = data

    if (!rows || rows.length === 0) {
        return (
            <div
                className="flex items-center justify-center text-sm text-muted-foreground rounded-lg border border-dashed"
                style={{ height }}
            >
                No data to display
            </div>
        )
    }

    if (chartType === 'bar') return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey={yKey} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )

    if (chartType === 'line') return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                    type="monotone"
                    dataKey={yKey}
                    stroke={COLORS[0]}
                    strokeWidth={2}
                    dot={false}
                />
            </LineChart>
        </ResponsiveContainer>
    )

    if (chartType === 'pie') return (
        <ResponsiveContainer width="100%" height={height}>
            <PieChart>
                <Pie
                    data={rows}
                    dataKey={yKey}
                    nameKey={xKey}
                    cx="50%"
                    cy="50%"
                    outerRadius={height / 3}
                    label={({ name, percent }: { name: string; percent: number }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                    }
                >
                    {rows.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    )

    return null
}