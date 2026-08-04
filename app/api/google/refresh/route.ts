import { NextRequest, NextResponse } from 'next/server'
import firebaseConfig from '@/firebase-applet-config.json'

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json()

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token é obrigatório.' }, { status: 400 })
    }

    const clientId = firebaseConfig.oAuthClientId
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET || ''

    if (!clientId) {
      return NextResponse.json({ error: 'OAuth Client ID não configurado no firebase-applet-config.json.' }, { status: 500 })
    }

    const params = new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })

    if (clientSecret) {
      params.append('client_secret', clientSecret)
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })

    const data = await response.json()

    if (!response.ok) {
      if (data.error === 'invalid_request' && data.error_description?.includes('client_secret')) {
        console.info('[GoogleCalendar Refresh Route] client_secret is required by Google OAuth for non-PKCE clients.')
      } else {
        console.warn('[GoogleCalendar Refresh Route Error]', data)
      }
      return NextResponse.json({
        error: data.error_description || data.error || 'Falha ao renovar token no Google.'
      }, { status: response.status })
    }

    const expiresIn = data.expires_in || 3600
    const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000).toISOString()

    return NextResponse.json({
      access_token: data.access_token,
      expires_in: expiresIn,
      expires_at: expiresAt
    })
  } catch (err: any) {
    console.error('[GoogleCalendar Refresh API Exception]', err)
    return NextResponse.json({ error: err.message || 'Erro interno do servidor.' }, { status: 500 })
  }
}
