import { VizSpec, ParsedLLMResponse } from './types/visualizer'

export function parseLLMResponse(raw: string): ParsedLLMResponse {
    // regex finds ```viz ... ``` blocks
    const vizBlockRegex = /```viz\s*([\s\S]*?)```/i

    const match = raw.match(vizBlockRegex)

    if (!match) {
        // no viz block found — check for existing mermaid blocks
        const mermaidRegex = /```mermaid\s*([\s\S]*?)```/i
        const mermaidMatch = raw.match(mermaidRegex)

        if (mermaidMatch) {
            return {
                text: raw.replace(mermaidRegex, '').trim(),
                viz: {
                    type: 'mermaid',
                    data: { syntax: mermaidMatch[1].trim() }
                }
            }
        }

        // no viz at all
        return { text: raw, viz: null }
    }

    // remove the viz block from the text
    const text = raw.replace(vizBlockRegex, '').trim()

    // safely parse the JSON
    try {
        const parsed = JSON.parse(match[1].trim())

        if (!isValidVizSpec(parsed)) {
            console.warn('Invalid viz spec shape:', parsed)
            return { text: raw, viz: null }   // fall back to plain text
        }

        return { text, viz: parsed }
    } catch (e) {
        console.warn('Failed to parse viz JSON:', e)
        return { text: raw, viz: null }     // fall back to plain text
    }
}

// basic runtime validation — guards against malformed LLM output
function isValidVizSpec(obj: unknown): obj is VizSpec {
    if (typeof obj !== 'object' || obj === null) return false

    const o = obj as Record<string, unknown>

    if (!('type' in o) || !('data' in o)) return false

    const validTypes = ['flowchart', 'chart', 'network', 'mermaid']
    if (!validTypes.includes(o.type as string)) return false

    // type-specific checks
    if (o.type === 'chart') {
        const d = o.data as Record<string, unknown>
        if (!d.chartType || !d.rows || !Array.isArray(d.rows)) return false
    }

    if (o.type === 'flowchart' || o.type === 'network') {
        const d = o.data as Record<string, unknown>
        if (!Array.isArray(d.nodes) || !Array.isArray(d.edges)) return false
    }

    if (o.type === 'mermaid') {
        const d = o.data as Record<string, unknown>
        if (typeof d.syntax !== 'string') return false
    }

    return true
}