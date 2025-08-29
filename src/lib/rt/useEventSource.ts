'use client'
import { useEffect, useRef } from 'react'

export function useEventSource(url: string, onMessage: (ev: MessageEvent) => void) {
  const ref = useRef<EventSource | null>(null)
  useEffect(() => {
    if (!url) return
    const es = new EventSource(url)
    ref.current = es
    es.onmessage = onMessage
    return () => { try { es.close() } catch {} }
  }, [url, onMessage])
}
