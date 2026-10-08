// Real-time Buzzer connection manager with WebSocket interface and robust auto-reconnect fallback

export interface BuzzerState {
  session: any | null
  currentRound: any | null
  teamScores: Record<string, number>
  playerScores: Record<string, number>
}

export interface BuzzerConnectionCallbacks {
  onStateUpdate?: (state: BuzzerState) => void
  onReconnecting?: (attempt: number, maxAttempts: number) => void
  onReconnected?: () => void
  onDisconnected?: (reason: string) => void
  onError?: (error: string) => void
}

export class BuzzerConnection {
  private sessionId: string
  private callbacks: BuzzerConnectionCallbacks
  private ws: WebSocket | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectIntervalMs = 2000
  private isDestroyed = false
  private isConnected = false
  private isReconnecting = false
  private lastKnownState: BuzzerState = {
    session: null,
    currentRound: null,
    teamScores: {},
    playerScores: {}
  }

  constructor(sessionId: string, callbacks: BuzzerConnectionCallbacks = {}) {
    this.sessionId = sessionId
    this.callbacks = callbacks
    this.connect()
  }

  public connect() {
    if (this.isDestroyed) return

    // Attempt WebSocket connection if available in browser
    if (typeof window !== 'undefined' && 'WebSocket' in window) {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsUrl = `${protocol}//${window.location.host}/api/buzzer/${this.sessionId}/ws`
        
        // Attempt creating socket; if server doesn't support raw WS, fallback gracefully to real-time sync
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          this.handleConnected()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.handleIncomingMessage(data)
          } catch {
            // Non-JSON message
          }
        }

        this.ws.onclose = () => {
          this.handleConnectionDrop('WebSocket closed')
        }

        this.ws.onerror = () => {
          // If WS fails, ensure real-time sync continues and triggers auto-reconnect
          this.handleConnectionDrop('WebSocket error')
        }
      } catch {
        this.handleConnectionDrop('Failed to initialize WebSocket')
      }
    }

    // Always start real-time state synchronization
    this.startStateSync()
  }

  private handleConnected() {
    this.isConnected = true
    this.isReconnecting = false
    this.reconnectAttempts = 0
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.syncState()
  }

  private handleConnectionDrop(reason: string) {
    if (this.isDestroyed) return
    this.isConnected = false

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.isReconnecting = true
      this.reconnectAttempts++
      this.callbacks.onReconnecting?.(this.reconnectAttempts, this.maxReconnectAttempts)

      if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
      this.reconnectTimer = setTimeout(() => {
        this.attemptReconnect()
      }, this.reconnectIntervalMs)
    } else {
      this.isReconnecting = false
      this.callbacks.onDisconnected?.(reason || 'Max reconnection attempts reached')
    }
  }

  private async attemptReconnect() {
    if (this.isDestroyed) return

    try {
      // Re-fetch current state to verify connection
      const res = await fetch(`/api/buzzer/${this.sessionId}`)
      if (res.ok) {
        const data = await res.json()
        this.isConnected = true
        this.isReconnecting = false
        this.reconnectAttempts = 0
        this.callbacks.onReconnected?.()

        // Re-send last state upon successful reconnection
        this.updateStateFromSession(data.session)
      } else {
        this.handleConnectionDrop('HTTP check failed during reconnect')
      }
    } catch {
      this.handleConnectionDrop('Network error during reconnect')
    }
  }

  private startStateSync() {
    if (this.pollTimer) clearInterval(this.pollTimer)
    this.syncState()
    this.pollTimer = setInterval(() => {
      if (!this.isDestroyed && !this.isReconnecting) {
        this.syncState()
      }
    }, 1000)
  }

  public async syncState(): Promise<BuzzerState | null> {
    try {
      const res = await fetch(`/api/buzzer/${this.sessionId}`)
      if (res.ok) {
        const data = await res.json()
        if (this.isReconnecting) {
          this.isReconnecting = false
          this.reconnectAttempts = 0
          this.callbacks.onReconnected?.()
        }
        this.isConnected = true
        return this.updateStateFromSession(data.session)
      } else {
        if (!this.isReconnecting) {
          this.handleConnectionDrop(`Server returned ${res.status}`)
        }
        return null
      }
    } catch (err: any) {
      if (!this.isReconnecting) {
        this.handleConnectionDrop(err.message || 'Fetch failed')
      }
      return null
    }
  }

  private updateStateFromSession(session: any): BuzzerState {
    const currentRound = session?.rounds?.find((r: any) => r.status === 'OPEN') || null
    const teamScores: Record<string, number> = {}
    if (session?.teams) {
      for (const t of session.teams) {
        teamScores[t.id] = t.score
      }
    }

    const playerScores: Record<string, number> = session?.playerScores || {}

    this.lastKnownState = {
      session,
      currentRound,
      teamScores,
      playerScores
    }

    this.callbacks.onStateUpdate?.(this.lastKnownState)
    return this.lastKnownState
  }

  private handleIncomingMessage(data: any) {
    if (data.type === 'STATE_SYNC' && data.session) {
      this.updateStateFromSession(data.session)
    } else if (data.type === 'ROUND_OPEN') {
      this.syncState()
    } else if (data.type === 'BUZZ') {
      this.syncState()
    }
  }

  // Direct, immediate buzz action with NO delays
  public async sendBuzz(roundId: string): Promise<{ ok: boolean; isFirst: boolean; alreadyBuzzed?: boolean; error?: string }> {
    // Immediate WebSocket message transmission if socket is open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'BUZZ', roundId }))
      } catch {}
    }

    // Direct, immediate HTTP POST
    try {
      const res = await fetch(`/api/buzzer/${this.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId })
      })

      const data = await res.json()
      if (res.ok) {
        return {
          ok: true,
          isFirst: !!data.isFirst,
          alreadyBuzzed: !!data.alreadyBuzzed
        }
      } else {
        return {
          ok: false,
          isFirst: false,
          error: data.error || 'Failed to buzz'
        }
      }
    } catch (err: any) {
      return {
        ok: false,
        isFirst: false,
        error: err.message || 'Network error sending buzz'
      }
    }
  }

  // Teacher Open Question action with guaranteed 3-second timeout fallback
  public async openQuestion(roundId: string): Promise<{ ok: boolean; session?: any; error?: string }> {
    // Send via WebSocket if available
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'OPEN_ROUND', roundId }))
      } catch {}
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    try {
      const res = await fetch(`/api/buzzer/${this.sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'OPEN_ROUND', roundId }),
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        this.updateStateFromSession(data.session)
        return { ok: true, session: data.session }
      } else {
        const errData = await res.json().catch(() => ({}))
        return { ok: false, error: errData.error || 'Server rejected open question' }
      }
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        return { ok: false, error: 'Confirmation timed out after 3 seconds' }
      }
      return { ok: false, error: err.message || 'Network error opening question' }
    }
  }

  public destroy() {
    this.isDestroyed = true
    if (this.pollTimer) clearInterval(this.pollTimer)
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.ws) {
      try {
        this.ws.close()
      } catch {}
    }
  }
}
