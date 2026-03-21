"use client"

import { useState } from 'react'
import { AgentFlowData } from '@/app/types/visualizer'

export function useAgentStream(url: string | null) {
    const [data, setData] = useState<AgentFlowData | null>(null)
    const [status, setStatus] = useState<'idle' | 'connecting' | 'live' | 'closed'>('idle')

    // WebSocket logic comes in Phase 4
    // placeholder so the hook can already be imported without errors

    return { data, status }
}