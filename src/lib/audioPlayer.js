import { useSyncExternalStore } from 'react'

const listeners = new Set()
let audio = null
let currentUrl = null
let snap = { url: null, currentTime: 0, duration: 0, playing: false }

function element() {
  if (audio || typeof Audio === 'undefined') return audio
  audio = new Audio()
  audio.preload = 'metadata'
  audio.addEventListener('play', () => publish(true))
  audio.addEventListener('pause', () => publish(true))
  audio.addEventListener('loadedmetadata', () => publish(true))
  audio.addEventListener('timeupdate', () => publish(false))
  audio.addEventListener('ended', () => {
    currentUrl = null
    publish(true)
  })
  return audio
}

function publish(force) {
  const el = audio
  const next = {
    url: currentUrl,
    currentTime: el?.currentTime || 0,
    duration: el && Number.isFinite(el.duration) ? el.duration : 0,
    playing: Boolean(currentUrl && el && !el.paused && !el.ended),
  }
  const same = snap.url === next.url
    && snap.playing === next.playing
    && snap.duration === next.duration
    && Math.abs(snap.currentTime - next.currentTime) < 0.25
  if (!force && same) return
  if (same && force && snap.currentTime === next.currentTime) return
  snap = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) stopAudio()
  }
}

function getSnapshot() {
  return snap
}

export function useAudioPlayer() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return ''
  const rounded = Math.round(seconds)
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`
}

export function toggleAudio(url) {
  const el = element()
  if (!el || !url) return
  if (currentUrl === url && !el.paused && !el.ended) {
    el.pause()
    return
  }
  if (currentUrl !== url) {
    currentUrl = url
    el.src = url
  } else if (el.ended) {
    el.currentTime = 0
  }
  const pending = el.play()
  if (pending) {
    pending.catch(() => {
      if (currentUrl === url) currentUrl = null
      publish(true)
    })
  }
  publish(true)
}

export function stopAudio() {
  if (!audio) return
  audio.pause()
  currentUrl = null
  publish(true)
}
