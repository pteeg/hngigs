import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { logStaff, markStaffSession } from '../lib/staffLog'

const AuthContext = createContext(null)

function messageFor(error) {
  switch (error?.code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'That email or password isn’t right.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.'
    default:
      return error?.message || 'Something went wrong. Try again.'
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      setUser(next)
      setReady(true)
    })
  }, [])

  async function signIn(email, password) {
    setError('')
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
      markStaffSession(credential.user.uid)
      logStaff('signed_in')
    } catch (err) {
      const message = messageFor(err)
      setError(message)
      throw new Error(message)
    }
  }

  async function resetPassword(email) {
    setError('')
    try {
      await sendPasswordResetEmail(auth, email.trim())
    } catch (err) {
      const message = messageFor(err)
      setError(message)
      throw new Error(message)
    }
  }

  async function logOut() {
    setError('')
    await logStaff('signed_out')
    await signOut(auth)
  }

  const value = useMemo(
    () => ({ user, ready, error, setError, signIn, resetPassword, logOut }),
    [user, ready, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
