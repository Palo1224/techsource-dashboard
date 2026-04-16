import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

// paso: 'email' | 'confirmar' | 'admin'
export default function Login({ onClienteLogin }) {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [paso, setPaso]         = useState('email')
  const [cliente, setCliente]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // ── Paso 1: verificar email ──────────────────────────────────────────────
  async function handleEmail(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: queryError } = await supabase
      .from('clientes')
      .select('*')
      .ilike('email', email)
      .maybeSingle()

    setLoading(false)

    if (!queryError && data) {
      if (data.permitido === false) {
        setError('Tu cuenta no tiene acceso habilitado. Contactá al administrador.')
        return
      }
      // Email encontrado en clientes → mostrar confirmación antes de entrar
      setCliente(data)
      setPaso('confirmar')
    } else {
      // No está en clientes → asumir que es admin
      setPaso('admin')
    }
  }

  // ── Paso 2a: entrar como cliente ─────────────────────────────────────────
  function entrarComoCliente() {
    onClienteLogin(cliente)
    navigate('/mis-cotizaciones', { replace: true })
  }

  // ── Paso 2b: entrar como admin ───────────────────────────────────────────
  async function handleAdmin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })

    if (err) {
      setError('Credenciales incorrectas.')
      setLoading(false)
      return
    }

    // Verificar rol en la tabla user_roles
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

    // Es admin → App.jsx redirige via onAuthStateChange + checkAdminRole
    setLoading(false)
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <div className="bg-illustration" />
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <img src="/assets/logo.png" alt="TechSource Solutions" />
          </div>

          <h2>Iniciar sesión</h2>

          {error && <div className="login-error">{error}</div>}

          {/* ── Email ── */}
          {paso === 'email' && (
            <form className="login-form" onSubmit={handleEmail}>
              <input
                type="email"
                placeholder="Tu correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
              <button className="login-btn" type="submit" disabled={loading}>
                {loading ? 'Verificando...' : 'Continuar'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 4px' }}>
                <div style={{ flex: 1, height: 1, background: '#e8edf4' }} />
                <span style={{ fontSize: '0.75rem', color: '#b0baca', whiteSpace: 'nowrap' }}>acceso restringido</span>
                <div style={{ flex: 1, height: 1, background: '#e8edf4' }} />
              </div>
              <button
                type="button"
                onClick={() => setPaso('admin')}
                style={{
                  background: 'none', border: '1px solid #d0d8e8', borderRadius: 8,
                  color: '#5b6f93', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600,
                  padding: '9px 0', width: '100%', letterSpacing: '0.02em',
                }}
              >
                Panel de administración
              </button>
            </form>
          )}

          {/* ── Confirmar cliente ── */}
          {paso === 'confirmar' && cliente && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: '#f0f7ff', border: '1px solid #ccdeff',
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%', background: '#2f6fed',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '1.1rem', flexShrink: 0,
                }}>
                  {(cliente.nombre_completo || cliente.email)[0].toUpperCase()}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: '#1d315d', fontSize: '0.95rem' }}>
                    {cliente.nombre_completo}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#6a7d9c' }}>{cliente.email}</p>
                </div>
              </div>

              <button className="login-btn" onClick={entrarComoCliente}>
                Entrar como cliente
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: '#e8edf4' }} />
                <span style={{ fontSize: '0.75rem', color: '#b0baca', whiteSpace: 'nowrap' }}>acceso restringido</span>
                <div style={{ flex: 1, height: 1, background: '#e8edf4' }} />
              </div>

              <button
                type="button"
                onClick={() => setPaso('admin')}
                style={{
                  background: 'none', border: '1px solid #d0d8e8', borderRadius: 8,
                  color: '#5b6f93', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600,
                  padding: '9px 0', width: '100%', letterSpacing: '0.02em',
                }}
              >
                Panel de administración
              </button>

              <button
                type="button"
                onClick={() => { setPaso('email'); setCliente(null); setError('') }}
                style={{ background: 'none', border: 'none', color: '#9aaabf', cursor: 'pointer', fontSize: '0.82rem' }}
              >
                ← Cambiar correo
              </button>
            </div>
          )}

          {/* ── Admin: email + contraseña ── */}
          {paso === 'admin' && (
            <form className="login-form" onSubmit={handleAdmin}>
              <input
                type="email"
                placeholder="Correo de administrador"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                autoFocus
              />
              <button className="login-btn" type="submit" disabled={loading}>
                {loading ? 'Ingresando...' : 'Ingresar al panel'}
              </button>
              <button
                type="button"
                onClick={() => { setPaso('email'); setError('') }}
                style={{ background: 'none', border: 'none', color: '#9aaabf', cursor: 'pointer', fontSize: '0.82rem' }}
              >
                ← Volver
              </button>
            </form>
          )}

        </div>
      </div>
    </>
  )
}
