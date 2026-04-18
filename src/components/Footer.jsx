import { useNavigate } from 'react-router-dom'

export default function Footer() {
  const navigate = useNavigate()

  return (
    <footer className="public-footer">
      <span
        onClick={() => navigate('/ts-panel/auth')}
        style={{ cursor: 'default', userSelect: 'none' }}
      >
        © {new Date().getFullYear()} TechSource Solutions. Todos los derechos reservados.
      </span>
    </footer>
  )
}
