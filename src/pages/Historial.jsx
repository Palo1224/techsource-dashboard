import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import LineChart from '../components/LineChart'
import Table from '../components/Table'
import Pagination, { paginate } from '../components/Pagination'

export default function Historial() {
  const [historial, setHistorial] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [producto, setProducto] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    Promise.all([
      supabase.from('historial_precios').select('*').order('fecha_cambio', { ascending: true }),
      supabase.from('vista_catalogo_proveedores').select('sku,nombre,categoria,proveedor,source,fecha_sync'),
    ]).then(([{ data: hist }, { data: cat }]) => {
      setHistorial(hist || [])
      setCatalogo(cat || [])
      setLoading(false)
    })
  }, [])

  const categorias = useMemo(() => [...new Set(catalogo.map((x) => x.categoria).filter(Boolean))].sort(), [catalogo])
  const productos = useMemo(() => [...new Set(historial.map((x) => x.nombre).filter(Boolean))].sort(), [historial])

  const filtrado = useMemo(() => {
    return historial.filter((item) => {
      const meta = catalogo.find((c) => c.sku === item.sku)
      const cumpleTexto = !busqueda || (item.nombre || '').toLowerCase().includes(busqueda.toLowerCase())
      const cumpleCategoria = !categoria || (meta?.categoria || '') === categoria
      const cumpleProducto = !producto || item.nombre === producto
      return cumpleTexto && cumpleCategoria && cumpleProducto
    })
  }, [historial, catalogo, busqueda, categoria, producto])

  const chartData = filtrado.map((r) => ({
    x: new Date(r.fecha_cambio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
    y: Number(r.precio_nuevo),
  }))

  const paginated = paginate([...filtrado].reverse(), page, pageSize)

  const columns = [
    { key: 'nombre', label: 'Producto' },
    { key: 'proveedor', label: 'Proveedor', render: (r) => <span className="badge badge-gray">{r.proveedor || 'Proveedor_Mockaroo'}</span> },
    { key: 'precio_anterior', label: 'Anterior', render: (r) => `$${Number(r.precio_anterior).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
    { key: 'precio_nuevo', label: 'Nuevo', render: (r) => <strong>${Number(r.precio_nuevo).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> },
    { key: 'cambio', label: 'Cambio', render: (r) => {
      const diff = Number(r.precio_nuevo) - Number(r.precio_anterior)
      const pct = Number(r.precio_anterior) !== 0 ? (diff / Number(r.precio_anterior)) * 100 : 0
      const sube = diff >= 0
      return (
        <span style={{ color: sube ? '#16a34a' : '#dc2626', fontWeight: 800 }}>
          {sube ? '↗' : '↘'} {pct.toFixed(1)}%
        </span>
      )
    }},
    { key: 'fecha_cambio', label: 'Fecha', render: (r) => r.fecha_cambio ? new Date(r.fecha_cambio).toLocaleString('es-CO') : '' },
  ]

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Historial de Precios</h1>
          <p className="page-subtitle">Registro de cambios ({filtrado.length})</p>
        </div>
      </div>

      <div className="card filters-card" style={{ marginBottom: 14 }}>
        <div className="filtros-grid">
          <input className="input-filtro" placeholder="Buscar producto..." value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPage(1) }} />
          <select className="input-filtro" value={categoria} onChange={(e) => { setCategoria(e.target.value); setPage(1) }}>
            <option value="">Todas las categorías</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input-filtro" value={producto} onChange={(e) => { setProducto(e.target.value); setPage(1) }}>
            <option value="">Todos los productos</option>
            {productos.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="card historial-chart-card" style={{ marginBottom: 14 }}>
        <h2>Evolución de precios</h2>
        <LineChart data={chartData} height={260} />
      </div>

      <div className="card">
        <Table columns={columns} data={paginated} loading={loading} emptyMessage="No se encontraron registros." />
        <Pagination page={page} pageSize={pageSize} total={filtrado.length} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1) }} label="registros" />
      </div>
    </div>
  )
}
