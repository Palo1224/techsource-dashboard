import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import Modal from '../components/Modal'

const CAT_ICONS = {
  Laptops: '💻', Monitores: '🖥️', Memorias: '💾',
  Periféricos: '🖱️', USB: '🔌', Tablets: '📱',
  Almacenamiento: '🗄️', Smartphones: '📱',
}

function usd(n) { return `USD ${Number(n ?? 0).toFixed(0)}` }
function calcVenta(precio, pct) {
  return Math.round(Number(precio || 0) * (1 + Number(pct || 0) / 100))
}
function fmtFecha(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Porcentajes() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('Todas')
  const [catInputs, setCatInputs] = useState({})
  const [savingCat, setSavingCat] = useState({})
  const [prodInputs, setProdInputs] = useState({})
  const [savingProd, setSavingProd] = useState({})
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const [historial, setHistorial] = useState([])
  const [historialLoading, setHistorialLoading] = useState(false)

  async function cargarProductos() {
    const { data } = await supabase
      .from('catalogo_proveedores')
      .select('id,sku,nombre,categoria,precio,porcentaje,precio_venta,imagen_url')
      .order('categoria')
      .order('nombre')
    const prods = data || []
    setProductos(prods)
    const catMap = {}
    prods.forEach(p => {
      if (!catMap[p.categoria]) catMap[p.categoria] = new Set()
      catMap[p.categoria].add(Number(p.porcentaje ?? 0))
    })
    const inputs = {}
    for (const [cat, set] of Object.entries(catMap)) {
      inputs[cat] = set.size === 1 ? String([...set][0]) : ''
    }
    setCatInputs(inputs)
  }

  useEffect(() => {
    cargarProductos().then(() => setLoading(false))
  }, [])

  async function registrarLog(tipo, referencia, porcentaje_anterior, porcentaje_nuevo) {
    await supabase
      .from('log_porcentajes')
      .insert({ tipo, referencia, porcentaje_anterior, porcentaje_nuevo })
  }

  async function abrirHistorial() {
    setHistorialAbierto(true)
    setHistorialLoading(true)
    const { data, error } = await supabase
      .from('log_porcentajes')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(50)
    if (error) console.error('Error al cargar historial:', error)
    setHistorial(data || [])
    setHistorialLoading(false)
  }

  const listaCategorias = useMemo(() =>
    [...new Set(productos.map(p => p.categoria).filter(Boolean))].sort()
  , [productos])

  const categoriaInfo = useMemo(() => {
    const map = {}
    listaCategorias.forEach(cat => {
      const prods = productos.filter(p => p.categoria === cat)
      const pcts = new Set(prods.map(p => Number(p.porcentaje ?? 0)))
      map[cat] = { esMixto: pcts.size > 1, count: prods.length }
    })
    return map
  }, [productos, listaCategorias])

  async function aplicarCategoria(cat) {
    const rawVal = catInputs[cat]
    if (rawVal === '' || rawVal === undefined) return
    const pct = Number(rawVal)
    if (isNaN(pct)) return
    setSavingCat(s => ({ ...s, [cat]: true }))

    const prods = productos.filter(p => p.categoria === cat)
    const pctsPrevios = new Set(prods.map(p => Number(p.porcentaje ?? 0)))
    const pctAnterior = pctsPrevios.size === 1 ? [...pctsPrevios][0] : null

    const results = await Promise.all(
      prods.map(p =>
        supabase
          .from('catalogo_proveedores')
          .update({ porcentaje: pct, precio_venta: calcVenta(p.precio, pct) })
          .eq('id', p.id)
      )
    )

    const firstError = results.find(r => r.error)
    if (firstError) {
      console.error('Error al guardar porcentaje de categoría:', firstError.error)
    } else {
      await registrarLog('categoria', cat, pctAnterior, pct)
      await cargarProductos()
      setProdInputs({})
    }
    setSavingCat(s => ({ ...s, [cat]: false }))
  }

  async function guardarProducto(prod) {
    const rawVal = prodInputs[prod.id]
    if (rawVal === undefined) return
    const pct = Number(rawVal)
    if (isNaN(pct)) return
    const pctAnterior = Number(prod.porcentaje ?? 0)
    const precio_venta = calcVenta(prod.precio, pct)
    setSavingProd(s => ({ ...s, [prod.id]: true }))
    const { error } = await supabase
      .from('catalogo_proveedores')
      .update({ porcentaje: pct, precio_venta })
      .eq('id', prod.id)
    if (!error) {
      await registrarLog('producto', prod.sku, pctAnterior, pct)
      await cargarProductos()
      setProdInputs(prev => { const n = { ...prev }; delete n[prod.id]; return n })
    } else {
      console.error('Error al guardar porcentaje de producto:', error)
    }
    setSavingProd(s => ({ ...s, [prod.id]: false }))
  }

  const filtrado = useMemo(() => {
    const q = busqueda.toLowerCase()
    return productos.filter(p => {
      const matchQ = !q ||
        (p.nombre || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q)
      const matchCat = filtroCategoria === 'Todas' || p.categoria === filtroCategoria
      return matchQ && matchCat
    })
  }, [productos, busqueda, filtroCategoria])

  const resumen = useMemo(() => {
    let compra = 0, venta = 0
    filtrado.forEach(p => {
      const pct = prodInputs[p.id] !== undefined
        ? Number(prodInputs[p.id])
        : Number(p.porcentaje ?? 0)
      compra += Number(p.precio || 0)
      venta += calcVenta(p.precio, pct)
    })
    return { count: filtrado.length, compra, venta, margen: venta - compra }
  }, [filtrado, prodInputs])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Porcentajes de precios</h1>
          <p className="page-subtitle">
            Ajustá el porcentaje de incremento por categoría o por producto.
            El precio de venta se calcula automáticamente.
          </p>
        </div>
        <button className="btn-historial-pct" onClick={abrirHistorial}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="15" height="15">
            <circle cx="10" cy="10" r="8" />
            <polyline points="10 6 10 10 13 12" />
          </svg>
          Ver historial de cambios
        </button>
      </div>

      {/* CATEGORÍAS */}
      <h2 className="section-title" style={{ marginBottom: 14 }}>Incremento por categoría</h2>

      {loading ? (
        <p style={{ color: '#8a9bb8', fontSize: '0.88rem' }}>Cargando...</p>
      ) : (
        <div className="pct-cat-grid">
          {listaCategorias.map(cat => {
            const info = categoriaInfo[cat]
            const inputVal = catInputs[cat] ?? ''
            return (
              <div key={cat} className="pct-cat-card">
                <div className="pct-cat-top">
                  <span className="pct-cat-icon-box">{CAT_ICONS[cat] || '📦'}</span>
                  <div>
                    <h3 className="pct-cat-nombre">{cat}</h3>
                    <p className="pct-cat-count">{info.count} producto{info.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="pct-cat-field">
                  <label className="pct-cat-label">Porcentaje</label>
                  <div className="pct-cat-input-row">
                    <input
                      type="number"
                      min="0"
                      max="500"
                      step="1"
                      className="pct-input"
                      placeholder={info.esMixto ? 'Mixto' : '0'}
                      value={inputVal}
                      onChange={e => setCatInputs(s => ({ ...s, [cat]: e.target.value }))}
                    />
                    <span className="pct-sign">%</span>
                  </div>
                </div>
                <button
                  className="pct-aplicar-btn"
                  onClick={() => aplicarCategoria(cat)}
                  disabled={savingCat[cat] || inputVal === ''}
                >
                  {savingCat[cat] ? 'Guardando…' : 'Aplicar a categoría'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* PRODUCTOS */}
      <h2 className="section-title" style={{ marginTop: 28, marginBottom: 14 }}>
        Simulación por producto
      </h2>

      <section className="card">
        <div className="pct-toolbar">
          <input
            className="input-filtro pct-search"
            placeholder="Buscar por nombre o SKU..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          <select
            className="input-filtro pct-select"
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
          >
            <option value="Todas">Todas las categorías</option>
            {listaCategorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="pct-summary">
          <div className="pct-summary-card">
            <p className="pct-summary-label">Productos</p>
            <b className="pct-summary-value">{resumen.count}</b>
          </div>
          <div className="pct-summary-card">
            <p className="pct-summary-label">Costo total</p>
            <b className="pct-summary-value">{usd(resumen.compra)}</b>
          </div>
          <div className="pct-summary-card">
            <p className="pct-summary-label">Venta simulada</p>
            <b className="pct-summary-value">{usd(resumen.venta)}</b>
          </div>
          <div className="pct-summary-card">
            <p className="pct-summary-label">Margen proyectado</p>
            <b className="pct-summary-value pct-summary-verde">{usd(resumen.margen)}</b>
          </div>
        </div>

        <div className="pct-table-wrap">
          <table className="pct-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>SKU</th>
                <th>Precio costo</th>
                <th style={{ width: 110 }}>%</th>
                <th>Precio venta</th>
                <th>Utilidad</th>
                <th style={{ width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtrado.length === 0 && (
                <tr>
                  <td colSpan={8} className="pct-empty">No se encontraron productos.</td>
                </tr>
              )}
              {filtrado.map(p => {
                const rawInput = prodInputs[p.id]
                const pct = rawInput !== undefined ? Number(rawInput) : Number(p.porcentaje ?? 0)
                const venta = calcVenta(p.precio, pct)
                const utilidad = venta - Number(p.precio || 0)
                const dirty = rawInput !== undefined
                const saving = savingProd[p.id]
                return (
                  <tr key={p.id} className={dirty ? 'pct-row-dirty' : ''}>
                    <td>
                      <div className="producto-cell">
                        {p.imagen_url && (
                          <img src={p.imagen_url} alt="" className="producto-thumb"
                            onError={e => { e.target.style.display = 'none' }} />
                        )}
                        <span>{p.nombre}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-blue">{p.categoria}</span></td>
                    <td className="pct-sku">{p.sku}</td>
                    <td className="pct-money">{usd(p.precio)}</td>
                    <td>
                      <div className="pct-prod-input-row">
                        <input
                          type="number"
                          min="0"
                          max="500"
                          step="1"
                          className="pct-input pct-input-sm"
                          value={rawInput !== undefined ? rawInput : String(p.porcentaje ?? 0)}
                          onChange={e => setProdInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                        />
                        <span className="pct-sign">%</span>
                        {saving && <span className="pct-saving-dot" />}
                      </div>
                    </td>
                    <td className="pct-money pct-venta">{usd(venta)}</td>
                    <td className="pct-money pct-utilidad">{usd(utilidad)}</td>
                    <td>
                      {dirty && (
                        <button
                          className="pct-guardar-btn"
                          onClick={() => guardarProducto(p)}
                          disabled={saving}
                        >
                          {saving ? '…' : 'Guardar'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL HISTORIAL */}
      {historialAbierto && (
        <Modal
          title="Historial de cambios de porcentajes"
          onClose={() => setHistorialAbierto(false)}
          maxWidth={700}
        >
          {historialLoading ? (
            <p style={{ color: '#8a9bb8', fontSize: '0.88rem', padding: '12px 0' }}>Cargando...</p>
          ) : historial.length === 0 ? (
            <p style={{ color: '#8a9bb8', fontSize: '0.88rem', padding: '12px 0' }}>No hay registros todavía.</p>
          ) : (
            <div className="pct-hist-wrap">
              <table className="pct-hist-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Referencia</th>
                    <th>% Anterior</th>
                    <th>% Nuevo</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map(r => (
                    <tr key={r.id}>
                      <td className="pct-hist-fecha">{fmtFecha(r.fecha)}</td>
                      <td>
                        <span className={`badge ${r.tipo === 'categoria' ? 'badge-blue' : 'badge-green'}`}>
                          {r.tipo}
                        </span>
                      </td>
                      <td className="pct-hist-ref">{r.referencia}</td>
                      <td className="pct-hist-num">{r.porcentaje_anterior ?? '—'}%</td>
                      <td className="pct-hist-num pct-hist-nuevo">{r.porcentaje_nuevo}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
