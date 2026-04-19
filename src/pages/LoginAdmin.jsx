import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function LoginAdmin() {
  const navigate  = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })

    if (err) {
      setError('Credenciales incorrectas.')
      setLoading(false)
      return
    }

    const userId = data?.session?.user?.id
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      await supabase.auth.signOut()
      setError('Esta cuenta no tiene permisos de administrador.')
      setLoading(false)
      return
    }

    setLoading(false)
    // App.jsx redirige vía onAuthStateChange
  }

  return (
    <div className="login-admin-page">
      <div className="login-admin-card">

        <div className="login-logo" style={{ marginBottom: 24 }}>
          <img src="/assets/logo.png" alt="TechSource Solutions" style={{ height: 52, objectFit: 'contain' }} />
        </div>

        <h2 className="login-admin-title">Panel admin</h2>

        {error && (
          <div className="login-admin-error">{error}</div>
        )}

        <form className="login-admin-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button type="submit" className="login-admin-btn" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar al panel'}
          </button>
        </form>

        <div className="login-admin-footer">
          acceso restringido · solo administradores
        </div>

      </div>
    </div>
  )
}
