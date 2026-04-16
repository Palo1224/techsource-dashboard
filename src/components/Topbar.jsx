import { NavLink } from 'react-router-dom'

export default function Topbar({ ultimaSync }) {
  const syncText = ultimaSync
    ? `Última sync: ${new Date(ultimaSync).toLocaleString()}`
    : 'Última sync: --'

  return (
    <header className="topbar">
      <div className="logo">
        <img src="/assets/logo.png" alt="TechSource Solutions" />
      </div>

      <nav className="nav">
        <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Resumen
        </NavLink>
        <NavLink to="/catalogo" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Catálogo
        </NavLink>
        <NavLink to="/historial" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Historial
        </NavLink>
        <NavLink to="/cotizaciones" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Cotizaciones
        </NavLink>
      </nav>

      <div className="topbar-right">
        <div className="sync-pill">
          <span className="sync-icon">◔</span>
          <span>{syncText}</span>
        </div>
        <NavLink to="/nueva-cotizacion" className="btn-topbar">
          + Nueva cotización
        </NavLink>
        <button className="btn-login">Iniciar sesión</button>
      </div>
    </header>
  )
}
