import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ArtistsProvider } from './context/ArtistsContext'
import { SettingsProvider } from './context/SettingsContext'
import AuthGate from './components/AuthGate'
import Sidebar from './components/Sidebar'
import Artists from './pages/Artists'
import PressKit from './pages/PressKit'
import ArtistUpload from './pages/ArtistUpload'
import Settings from './pages/Settings'
import Pilot from './pages/Pilot'
import './index.css'

function StaffApp() {
  return (
    <AuthGate>
      <div className="app-shell">
        <Sidebar />
        <main className="main">
          <Routes>
            <Route path="/" element={<Navigate to="/artists" replace />} />
            <Route path="/artists" element={<Artists />} />
            <Route path="/artists/:id" element={<PressKit />} />
            <Route path="/pilot" element={<Pilot />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </AuthGate>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <ArtistsProvider>
          <Routes>
            <Route path="/u/:token" element={<ArtistUpload />} />
            <Route path="/p/:id" element={<PressKit publicView />} />
            <Route path="/*" element={<StaffApp />} />
          </Routes>
          </ArtistsProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
