import { useEffect, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { supabase } from '../supabase'

export default function PublicNavbar({ session, admin, clienteSession, onClienteLogout }) {
  const [ultimaSync, setUltimaSync] = useState(null)

  useEffect(() => {
    supabase
      .from('catalogo_proveedores')
      .select('fecha_sync')
      .order('fecha_sync', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]?.fecha_sync) setUltimaSync(data[0].fecha_sync)
      })
  }, [])

  async function handleLogout() {
    if (clienteSession) {
      onClienteLogout()
    } else {
      await supabase.auth.signOut()
    }
  }

  const estaLogueado = !!clienteSession || !!session

  return (
    <header className="topbar">
      <div className="logo">
        <img src="/assets/logo.png" alt="TechSource Solutions" />
      </div>

      <nav className="nav" style={{ flex: 'none', justifyContent: 'flex-start' }}>
        <NavLink to="/catalogo" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Catálogo
        </NavLink>
        {clienteSession && (
          <NavLink to="/mis-cotizaciones" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Mis Cotizaciones
          </NavLink>
        )}
        {admin && (
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Admin ↗
          </NavLink>
        )}
      </nav>

      <div className="topbar-right">
        {ultimaSync && (
          <div className="sync-pill">
            <span className="sync-icon">◔</span>
            <span>Última sync: {new Date(ultimaSync).toLocaleString()}</span>
          </div>
        )}

        <Link to="/cotizar" className="btn-nueva-cotizacion">
          + Nueva cotización
        </Link>

        {estaLogueado ? (
          <button className="btn-login" onClick={handleLogout}>
            Cerrar sesión
          </button>
        ) : (
          <Link to="/login" className="btn-login">
            Iniciar sesión
          </Link>
        )}
      </div>
    </header>
  )
}
