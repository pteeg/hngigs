import { IconCheck, IconCircleDashed } from '@tabler/icons-react'
import { assetFlags } from '../data/artists'

const KINDS = [
  { key: 'bio', label: 'Bio' },
  { key: 'photos', label: 'Photos' },
  { key: 'videos', label: 'Videos' },
]

export default function AssetPill({ artist }) {
  const flags = assetFlags(artist)
  const anyReceived = KINDS.some(({ key }) => flags[key])

  if (!anyReceived) {
    return (
      <span className="pill-group">
        <span className="pill pill-none">
          <IconCircleDashed size={14} stroke={1.5} aria-hidden="true" />
          Awaiting assets
        </span>
      </span>
    )
  }

  return (
    <span className="pill-group">
      {KINDS.map(({ key, label }) => {
        const ok = flags[key]
        return (
          <span key={key} className={`pill ${ok ? 'pill-received' : 'pill-partial'}`}>
            {ok && <IconCheck size={12} stroke={3} aria-hidden="true" />}
            {label}
            {!ok && <span className="sr-only"> missing</span>}
          </span>
        )
      })}
    </span>
  )
}
