import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, User } from 'firebase/auth'
import firebaseConfig from '../firebase-applet-config.json'

// Ensure single Firebase App initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
export const auth = getAuth(app)

export const calendarProvider = new GoogleAuthProvider()
calendarProvider.addScope('https://www.googleapis.com/auth/calendar')
calendarProvider.addScope('https://www.googleapis.com/auth/calendar.events')
calendarProvider.setCustomParameters({
  access_type: 'offline',
  prompt: 'consent'
})

export interface GoogleAuthResult {
  user: User
  accessToken: string
  refreshToken?: string
  expiresAt: string
  email: string
}

export async function connectGoogleAccount(): Promise<GoogleAuthResult | null> {
  try {
    const result = await signInWithPopup(auth, calendarProvider)
    const credential = GoogleAuthProvider.credentialFromResult(result)
    const accessToken = credential?.accessToken

    if (!accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google. Tente novamente.')
    }

    const tokenResponse = (result as any)?._tokenResponse
    const refreshToken = tokenResponse?.refreshToken || (credential as any)?.refreshToken
    const expiresIn = Number(tokenResponse?.oauthExpireIn || 3600)
    const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000).toISOString()

    return {
      user: result.user,
      accessToken,
      refreshToken: refreshToken || undefined,
      expiresAt,
      email: result.user.email || ''
    }
  } catch (err: any) {
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
      console.info('Autenticação Google cancelada pelo usuário (janela fechada).')
      return null
    }
    if (err?.code === 'auth/popup-blocked') {
      throw new Error('Pop-up de autenticação bloqueado pelo seu navegador. Por favor, libere os pop-ups para este site e tente novamente.')
    }
    console.error('Error connecting Google Account:', err)
    throw new Error(err.message || 'Falha ao autenticar com o Google.')
  }
}

export async function disconnectGoogleAccount(): Promise<void> {
  try {
    await firebaseSignOut(auth)
  } catch (err) {
    console.error('Error signing out of Google Auth:', err)
  }
}
