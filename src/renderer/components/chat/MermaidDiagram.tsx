import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    darkMode: true,
    background: '#1f2937',
    primaryColor: '#3b82f6',
    primaryTextColor: '#f3f4f6',
    lineColor: '#6b7280',
  },
})

let mermaidIdCounter = 0

export function MermaidDiagram({ chart }: { chart: string }): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const prevChartRef = useRef('')

  useEffect(() => {
    if (chart === prevChartRef.current) return
    prevChartRef.current = chart

    const timer = setTimeout(() => {
      let cancelled = false
      const id = `mermaid-${++mermaidIdCounter}`

      mermaid
        .render(id, chart)
        .then(({ svg: rendered }) => {
          if (!cancelled) {
            setSvg(rendered)
            setError(null)
          }
        })
        .catch(() => {
          // During streaming, partial content will fail — silently wait
          if (!cancelled && !svg) {
            setError(null)
          }
        })

      return () => {
        cancelled = true
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [chart, svg])

  if (svg) {
    return (
      <div
        ref={containerRef}
        className="my-2 flex justify-center overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    )
  }

  if (error) {
    return (
      <pre className="overflow-x-auto rounded bg-red-900/30 p-3 text-xs text-red-300">{chart}</pre>
    )
  }

  return <div className="py-4 text-center text-xs text-gray-500">図を描画中...</div>
}
