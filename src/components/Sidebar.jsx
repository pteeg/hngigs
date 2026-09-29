import { NavLink } from 'react-router-dom'
import { useArtists } from '../context/ArtistsContext'
import { IconFlask } from '@tabler/icons-react'
import { IconArtists, IconSettings } from './icons'

export default function Sidebar() {
  const { artists } = useArtists()

  return (
    <aside className="sidebar">
      <div className="logo-brand">
        <img src="/HN%20logo.png" alt="" className="logo-mark" />
        <div className="logo-text">
          <div className="logo-name">Hot Numbers Gigs</div>
          <div className="logo-powered">
            powered by <span className="logo-gigin">gigin<span>.</span></span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-label">Menu</div>
        <NavLink to="/artists" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <IconArtists />
          <span className="nav-item-label">Artists</span>
          <span className="nav-count">{artists.length}</span>
        </NavLink>
        <NavLink to="/pilot" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <IconFlask size={18} stroke={1.4} />
          <span className="nav-item-label">Pilot</span>
        </NavLink>
      </nav>

      <NavLink to="/settings" className={({ isActive }) => 'nav-item nav-settings' + (isActive ? ' active' : '')}>
        <IconSettings />
        <span className="nav-item-label">Settings</span>
      </NavLink>
    </aside>
  )
}
