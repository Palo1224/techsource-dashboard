import { NavLink } from 'react-router-dom'
import { supabase } from '../supabase'

const links = [
  { to: '/dashboard',      label: 'Resumen',       icon: '◈' },
  { to: '/admin/catalogo', label: 'Catálogo',       icon: '◻' },
  { to: '/historial',      label: 'Historial',      icon: '◷' },
  { to: '/cotizaciones',   label: 'Cotizaciones',   icon: '◑' },
  { to: '/clientes',       label: 'Clientes',       icon: '◎' },
]

export default function Sidebar() {
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/assets/logo.png" alt="TechSource" />
      </div>

      <nav className="sidebar-nav">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="sidebar-icon">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <button className="sidebar-logout" onClick={handleLogout}>
        ⏻ Salir
      </button>
    </aside>
  )
}
