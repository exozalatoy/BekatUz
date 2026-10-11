import { create } from 'zustand'
import { sendUserEvent } from '../lib/userSocket'
import type { ChatUserBrief } from '../lib/types'

export type CallStatus = 'idle' | 'incoming' | 'outgoing' | 'active'

type CallStore = {
  status: CallStatus
  callId: string | null
  peer: ChatUserBrief | null
  direction: 'incoming' | 'outgoing'
  seconds: number
  muted: boolean
  remoteStream: MediaStream | null
  startCall: (peer: ChatUserBrief) => Promise<void>
  acceptCall: () => Promise<void>
  declineCall: () => void
  endCall: () => void
  toggleMute: () => void
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

let pc: RTCPeerConnection | null = null
let localStream: MediaStream | null = null
let pending: Array<{ kind: 'offer' | 'answer' | 'ice'; value: RTCSessionDescriptionInit | RTCIceCandidateInit }> = []
let ringCtx: AudioContext | null = null
let ringTick: ReturnType<typeof setInterval> | null = null
let timerTick: ReturnType<typeof setInterval> | null = null
let timeoutTick: ReturnType<typeof setInterval> | null = null
let currentPeer: ChatUserBrief | null = null
let engaged = false

function iceCandidate(value: unknown): RTCIceCandidateInit | null {
  if (!value || typeof value !== 'object') return null
  const candidate = (value as RTCIceCandidateInit).candidate
  if (typeof candidate !== 'string' || !candidate) return null
  return value as RTCIceCandidateInit
}

function session(value: unknown): RTCSessionDescriptionInit | null {
  if (!value || typeof value !== 'object') return null
  const sdp = (value as RTCSessionDescriptionInit).sdp
  if (typeof sdp !== 'string' || !sdp) return null
  return value as RTCSessionDescriptionInit
}

function getAudioStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true, video: false })
}

function sendSignal(kind: string, value: unknown): void {
  if (!currentPeer) return
  const callId = useCallStore.getState().callId
  sendUserEvent({
    type: 'call:signal',
    data: { target_user_id: currentPeer.id, call_id: callId, kind, value },
  })
}

function createPeer(
  stream: MediaStream,
  onRemote: (stream: MediaStream) => void,
): RTCPeerConnection {
  const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS })
  peer.onicecandidate = (event) => {
    if (event.candidate) sendSignal('ice', event.candidate.toJSON())
  }
  peer.ontrack = (event) => {
    if (event.streams[0]) onRemote(event.streams[0])
    else onRemote(new MediaStream([event.track]))
  }
  stream.getTracks().forEach((track) => peer.addTrack(track, stream))
  return peer
}

function startRinging(): void {
  stopRinging()
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return
  const ctx = new AudioCtx()
  ringCtx = ctx
  const play = () => {
    if (!ringCtx) return
    const now = ringCtx.currentTime
    ;[440, 540].forEach((freq, index) => {
      const osc = ringCtx!.createOscillator()
      const gain = ringCtx!.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = now + index * 0.32
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28)
      osc.connect(gain)
      gain.connect(ringCtx!.destination)
      osc.start(start)
      osc.stop(start + 0.3)
    })
  }
  play()
  ringTick = setInterval(play, 1500)
}

function stopRinging(): void {
  if (ringTick) clearInterval(ringTick)
  ringTick = null
  if (ringCtx) {
    void ringCtx.close()
    ringCtx = null
  }
}

function clearCall() {
  engaged = false
  pending = []
  if (pc) {
    try {
      pc.ontrack = null
      pc.onicecandidate = null
      void pc.close()
    } catch {
      void 0
    }
    pc = null
  }
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop())
    localStream = null
  }
  currentPeer = null
  stopRinging()
  if (timerTick) clearInterval(timerTick)
  timerTick = null
  if (timeoutTick) clearInterval(timeoutTick)
  timeoutTick = null
}

export const useCallStore = create<CallStore>()((set, get) => ({
  status: 'idle',
  callId: null,
  peer: null,
  direction: 'outgoing',
  seconds: 0,
  muted: false,
  remoteStream: null,

  startCall: async (peer) => {
    if (get().status !== 'idle' || engaged) return
    let stream: MediaStream
    try {
      stream = await getAudioStream()
    } catch {
      return
    }
    engaged = true
    currentPeer = peer
    const callId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `call-${Date.now()}`
    set({
      status: 'outgoing',
      callId,
      peer,
      direction: 'outgoing',
      seconds: 0,
      muted: false,
      remoteStream: null,
    })
    sendUserEvent({
      type: 'call:invite',
      data: { target_user_id: peer.id, call_id: callId },
    })
    pc = createPeer(stream, (remoteStream) => set({ remoteStream }))
    localStream = stream
    sendSignal('offer', (await pc.createOffer()) as RTCSessionDescriptionInit)
    await pc.setLocalDescription()
    let elapsed = 0
    timeoutTick = setInterval(() => {
      elapsed += 1
      if (elapsed >= 45) get().endCall()
    }, 1000)
  },

  acceptCall: async () => {
    const state = get()
    if (state.status !== 'incoming' || engaged) return
    engaged = true
    stopRinging()
    let stream: MediaStream
    try {
      stream = await getAudioStream()
    } catch {
      get().declineCall()
      return
    }
    localStream = stream
    pc = createPeer(stream, (remoteStream) => set({ remoteStream }))
    set({
      status: 'active',
      direction: 'incoming',
      seconds: 0,
      muted: false,
    })
    timerTick = setInterval(() => set((s) => ({ seconds: s.seconds + 1 })), 1000)
    const offer = pending.find((item) => item.kind === 'offer')
    if (offer) {
      await pc.setRemoteDescription(offer.value as RTCSessionDescriptionInit)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      sendSignal('answer', answer as RTCSessionDescriptionInit)
    }
    const ice = pending.filter((item) => item.kind === 'ice')
    pending = []
    for (const item of ice) {
      try {
        await pc.addIceCandidate(iceCandidate(item.value))
      } catch {
        void 0
      }
    }
  },

  declineCall: () => {
    const state = get()
    sendUserEvent({
      type: 'call:end',
      data: {
        target_user_id: currentPeer?.id ?? state.peer?.id,
        call_id: state.callId,
      },
    })
    clearCall()
    set({ status: 'idle', callId: null, peer: null, remoteStream: null })
  },

  endCall: () => {
    const state = get()
    sendUserEvent({
      type: 'call:end',
      data: {
        target_user_id: currentPeer?.id ?? state.peer?.id,
        call_id: state.callId,
      },
    })
    clearCall()
    set({ status: 'idle', callId: null, peer: null, remoteStream: null })
  },

  toggleMute: () => {
    if (!localStream) return
    const next = !get().muted
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !next
    })
    set({ muted: next })
  },
}))

export function registerCallEvent(event: { type: string; data?: unknown }): void {
  const set = useCallStore.setState
  switch (event.type) {
    case 'call:invite': {
      const data = (event.data ?? {}) as {
        call_id?: string
        from?: ChatUserBrief
      }
      if (!data.from || !data.call_id) return
      const state = useCallStore.getState()
      if (state.status !== 'idle' && !engaged) return
      currentPeer = data.from
      set({
        status: 'incoming',
        callId: data.call_id,
        peer: data.from,
        direction: 'incoming',
        seconds: 0,
        muted: false,
        remoteStream: null,
      })
      startRinging()
      break
    }
    case 'call:signal': {
      const data = (event.data ?? {}) as {
        kind?: string
        value?: unknown
        call_id?: string
      }
      const state = useCallStore.getState()
      if (state.callId && data.call_id && data.call_id !== state.callId) return
      if (data.kind === 'offer') {
        if (state.status === 'incoming') {
          pending.push({ kind: 'offer', value: session(data.value) as RTCSessionDescriptionInit })
        }
      } else if (data.kind === 'answer') {
        const description = session(data.value)
        if (description && pc && state.status === 'outgoing') {
          void pc
            .setRemoteDescription(description)
            .then(() => {
              set({ status: 'active', seconds: 0 })
              if (timeoutTick) clearInterval(timeoutTick)
              timeoutTick = null
              timerTick = setInterval(
                () => set((s) => ({ seconds: s.seconds + 1 })),
                1000,
              )
            })
            .catch(() => void 0)
        }
      } else if (data.kind === 'ice') {
        const candidate = iceCandidate(data.value)
        if (candidate) {
          if (pc && engaged) {
            void pc.addIceCandidate(candidate).catch(() => void 0)
          } else {
            pending.push({ kind: 'ice', value: candidate })
          }
        }
      }
      break
    }
    case 'call:end': {
      const incoming = useCallStore.getState().status === 'incoming'
      clearCall()
      set({ status: 'idle', callId: null, peer: null, remoteStream: null })
      if (incoming) set({ status: 'idle' })
      break
    }
    default:
      break
  }
}