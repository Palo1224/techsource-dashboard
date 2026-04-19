import { useEffect, useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const links = [
  { to: '/dashboard',      label: 'Resumen' },
  { to: '/admin/catalogo', label: 'Catálogo' },
  { to: '/proveedores',    label: 'Proveedores' },
  { to: '/historial',      label: 'Historial' },
  { to: '/cotizaciones',   label: 'Cotizaciones' },
  { to: '/clientes',       label: 'Clientes' },
]

export default function AdminNavbar() {
  const [ultimaSync, setUltimaSync] = useState(null)

  useEffect(() => {
    supabase
      .from('vista_catalogo_proveedores')
      .select('fecha_sync')
      .order('fecha_sync', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]?.fecha_sync) setUltimaSync(data[0].fecha_sync)
      })
  }, [])

  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/catalogo', { replace: true })
  }

  const syncText = ultimaSync
    ? new Date(ultimaSync).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '--'

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-logo">
        <img src="/assets/logo.png" alt="TechSource" />
      </div>

      <nav className="admin-topbar-nav">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="admin-topbar-right">
        <div className="admin-sync-pill">
          <span>◔</span>
          <span>Sync: {syncText}</span>
        </div>
        <button className="admin-nueva-btn" onClick={() => window.location.href = '/cotizaciones'}>
          + Solicitar Cotización
        </button>
        <button className="admin-logout-btn" onClick={handleLogout} title="Salir">⏻</button>
      </div>
    </header>
  )
}
