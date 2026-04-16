import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import Table from '../components/Table'
import Pagination, { paginate } from '../components/Pagination'
import { getUltimaSync } from '../utils/helpers'

export default function Catalogo() {
  const [catalogo, setCatalogo] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    supabase
      .from('catalogo_proveedores')
      .select('*')
      .order('nombre', { ascending: true })
      .then(({ data }) => { setCatalogo(data || []); setLoading(false) })
  }, [])

  const categorias = useMemo(() => [...new Set(catalogo.map((x) => x.categoria).filter(Boolean))].sort(), [catalogo])
  const proveedores = useMemo(() => [...new Set(catalogo.map((x) => x.proveedor).filter(Boolean))].sort(), [catalogo])

  const filtrado = useMemo(() => {
    return catalogo.filter((item) => {
      const cumpleTexto = !busqueda || (item.nombre || '').toLowerCase().includes(busqueda.toLowerCase())
      const cumpleCategoria = !categoria || item.categoria === categoria
      const cumpleProveedor = !proveedor || item.proveedor === proveedor
      return cumpleTexto && cumpleCategoria && cumpleProveedor
    })
  }, [catalogo, busqueda, categoria, proveedor])

  const paginated = paginate(filtrado, page, pageSize)

  async function toggleVigente(item) {
    const nuevoValor = !item.vigente
    await supabase.from('catalogo_proveedores').update({ vigente: nuevoValor }).eq('id', item.id)
    setCatalogo((prev) => prev.map((p) => p.id === item.id ? { ...p, vigente: nuevoValor } : p))
  }

  const columns = [
    { key: 'sku', label: 'SKU' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'categoria', label: 'Categoría', render: (r) => <span className="badge badge-blue-soft">{r.categoria}</span> },
    { key: 'precio', label: 'Precio', render: (r) => `${r.precio ?? ''} ${r.moneda ?? ''}` },
    { key: 'proveedor', label: 'Proveedor' },
    { key: 'stock', label: 'Stock' },
    { key: 'fecha_sync', label: 'Última Sync', render: (r) => r.fecha_sync ? new Date(r.fecha_sync).toLocaleString() : '' },
    {
      key: 'vigente', label: 'Vigente',
      render: (r) => (
        <button
          onClick={() => toggleVigente(r)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '0.78rem', fontFamily: 'Inter, sans-serif',
            background: r.vigente ? '#d7f3e3' : '#fde2e1',
            color: r.vigente ? '#177d48' : '#b42318',
            transition: 'all 0.15s',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.vigente ? '#177d48' : '#b42318', flexShrink: 0 }} />
          {r.vigente ? 'Vigente' : 'Inactivo'}
        </button>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catálogo</h1>
          <p className="page-subtitle">{filtrado.length} de {catalogo.length} productos</p>
        </div>
      </div>

      <div className="card filters-card" style={{ marginBottom: 14 }}>
        <div className="filtros-grid">
          <input className="input-filtro" placeholder="Buscar por nombre..." value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPage(1) }} />
          <select className="input-filtro" value={categoria} onChange={(e) => { setCategoria(e.target.value); setPage(1) }}>
            <option value="">Todas las categorías</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input-filtro" value={proveedor} onChange={(e) => { setProveedor(e.target.value); setPage(1) }}>
            <option value="">Todos los proveedores</option>
            {proveedores.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <Table columns={columns} data={paginated} loading={loading} emptyMessage="No se encontraron productos." />
        <Pagination page={page} pageSize={pageSize} total={filtrado.length} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1) }} label="productos" />
      </div>
    </div>
  )
}
