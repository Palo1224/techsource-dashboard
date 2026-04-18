import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Table from '../components/Table'
import Pagination, { paginate } from '../components/Pagination'
import Modal from '../components/Modal'

export default function CatalogoPublico() {
  const [catalogo, setCatalogo] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [seleccionado, setSeleccionado] = useState(null)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    supabase
      .from('vista_catalogo_proveedores')
      .select('id,sku,nombre,descripcion,categoria,precio_venta,moneda,proveedor,stock,vigente,imagen_url')
      .eq('vigente', true)
      .order('nombre', { ascending: true })
      .then(({ data }) => { setCatalogo(data || []); setLoading(false) })
  }, [])

  const categorias = useMemo(() => [...new Set(catalogo.map((x) => x.categoria).filter(Boolean))].sort(), [catalogo])

  const filtrado = useMemo(() => catalogo.filter((item) => {
    const cumpleTexto = !busqueda || (item.nombre || '').toLowerCase().includes(busqueda.toLowerCase())
    const cumpleCategoria = !categoria || item.categoria === categoria
    return cumpleTexto && cumpleCategoria
  }), [catalogo, busqueda, categoria])

  const paginated = paginate(filtrado, page, pageSize)

  const columns = [
    { key: 'sku', label: 'SKU' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'categoria', label: 'Categoría', render: (r) => <span className="badge badge-blue">{r.categoria}</span> },
    { key: 'precio_venta', label: 'Precio', render: (r) => `${r.moneda ?? ''} ${r.precio_venta?.toFixed(0) ?? ''}` },
  ]

  return (
    <main className="container">
      <section className="catalogo-hero">
        <div>
          <h1>Catálogo de Productos</h1>
          <p>Explorá nuestra oferta y solicitá una cotización personalizada al instante.</p>
        </div>
        <Link to="/cotizar" className="catalogo-hero-btn">Solicitar cotización →</Link>
      </section>

      <section className="card filters-card" style={{ marginBottom: 14 }}>
        <div className="filtros-grid" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
          <input className="input-filtro" placeholder="Buscar por nombre..." value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPage(1) }} />
          <select className="input-filtro" value={categoria} onChange={(e) => { setCategoria(e.target.value); setPage(1) }}>
            <option value="">Todas las categorías</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </section>

      <section className="card">
        <div style={{ marginBottom: 10, color: '#6b7c98', fontSize: '0.88rem' }}>
          {filtrado.length} de {catalogo.length} productos
        </div>
        <Table
          columns={columns}
          data={paginated}
          loading={loading}
          emptyMessage="No se encontraron productos."
          onRowClick={(p) => { setSeleccionado(p); setImgError(false) }}
        />
        <Pagination page={page} pageSize={pageSize} total={filtrado.length} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1) }} label="productos" />
      </section>

      {seleccionado && (
        <Modal title={seleccionado.nombre} onClose={() => setSeleccionado(null)} maxWidth={520}>
          <div className="producto-modal-body">
            {seleccionado.imagen_url && !imgError && (
              <img
                src={seleccionado.imagen_url}
                alt={seleccionado.nombre}
                className="producto-modal-img"
                onError={() => setImgError(true)}
              />
            )}
            <div className="producto-modal-meta">
              <span className="badge badge-blue">{seleccionado.categoria}</span>
              <span className="producto-modal-precio">
                {seleccionado.moneda} {seleccionado.precio_venta?.toFixed(0)}
              </span>
            </div>
            {seleccionado.descripcion && (
              <p className="producto-modal-desc">{seleccionado.descripcion}</p>
            )}
            <div className="producto-modal-info">
              <span>SKU: <strong>{seleccionado.sku}</strong></span>
            </div>
          </div>
        </Modal>
      )}
    </main>
  )
}
