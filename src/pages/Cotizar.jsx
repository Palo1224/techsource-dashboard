import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { esPrecioVigente } from '../utils/helpers'
import { generateCotizacionPdf } from '../utils/generatePdf'

export default function Cotizar({ clienteSession }) {
  const [catalogo, setCatalogo] = useState([])
  const [clienteData, setClienteData] = useState(null)
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '' })
  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState([])
  const [guardada, setGuardada] = useState(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    supabase
      .from('catalogo_proveedores')
      .select('*')
      .eq('vigente', true)
      .order('nombre', { ascending: true })
      .then(({ data }) => setCatalogo(data || []))
  }, [])

  useEffect(() => {
    if (!clienteSession?.email) return
    // clienteSession ya viene de la tabla clientes, úsalo directamente
    setClienteData(clienteSession)
  }, [clienteSession])

  const productosFiltrados = useMemo(() =>
    catalogo.filter((p) =>
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.sku?.toLowerCase().includes(busqueda.toLowerCase())
    ),
    [catalogo, busqueda]
  )

  function agregar(producto) {
    setCarrito((prev) => {
      const ex = prev.find((p) => String(p.producto_id) === String(producto.id))
      if (ex) return prev.map((p) =>
        String(p.producto_id) === String(producto.id)
          ? { ...p, cantidad: p.cantidad + 1, subtotal: (p.cantidad + 1) * p.precio_unitario }
          : p
      )
      return [...prev, {
        producto_id: producto.id,
        nombre: producto.nombre,
        categoria: producto.categoria,
        proveedor: producto.proveedor,
        precio_unitario: Number(producto.precio),
        moneda: producto.moneda || 'USD',
        cantidad: 1,
        subtotal: Number(producto.precio),
        precio_vigente: esPrecioVigente(producto.fecha_sync),
      }]
    })
  }

  function cambiarCantidad(idx, cantidad) {
    const cant = Math.max(1, parseInt(cantidad) || 1)
    setCarrito((prev) => prev.map((p, i) =>
      i === idx ? { ...p, cantidad: cant, subtotal: cant * p.precio_unitario } : p
    ))
  }

  function eliminar(idx) {
    setCarrito((prev) => prev.filter((_, i) => i !== idx))
  }

  const totalProductos = carrito.length
  const totalUnidades  = carrito.reduce((acc, p) => acc + p.cantidad, 0)
  const total          = carrito.reduce((acc, p) => acc + p.subtotal, 0)
  const moneda         = carrito[0]?.moneda || 'USD'
  const productosAntiguos = carrito.filter((p) => !p.precio_vigente)

  const nombreCliente = clienteSession ? clienteData?.nombre_completo || clienteSession.email : form.nombre
  const emailCliente  = clienteSession ? clienteData?.email || clienteSession.email : form.email

  async function guardar() {
    if (!nombreCliente.trim() || !emailCliente.trim()) { alert('Completá tus datos.'); return }
    if (!carrito.length) { alert('Agregá al menos un producto.'); return }
    setGuardando(true)

    let clienteId = clienteData?.id ?? null
    if (!clienteId) {
      const { data: existing } = await supabase.from('clientes').select('id').ilike('email', emailCliente).maybeSingle()
      if (existing) {
        clienteId = existing.id
      } else {
        const { data: nuevo } = await supabase
          .from('clientes')
          .insert([{ nombre_completo: form.nombre, email: form.email, telefono: form.telefono || null }])
          .select('id').single()
        clienteId = nuevo?.id ?? null
      }
    }

    const { data, error } = await supabase
      .from('cotizaciones')
      .insert([{
        nombre_cliente: nombreCliente,
        email_cliente: emailCliente,
        cliente_id: clienteId,
        productos: carrito.map(({ nombre, cantidad, subtotal, categoria, proveedor, producto_id, precio_unitario, moneda, precio_vigente }) =>
          ({ nombre, cantidad, subtotal, categoria, proveedor, producto_id, precio_unitario, moneda, precio_vigente })
        ),
        total,
        fecha_creacion: new Date().toISOString(),
        estado: 'emitida',
        precios_vigentes: carrito.every((p) => p.precio_vigente),
      }])
      .select().single()

    setGuardando(false)
    if (error) { alert('Error al guardar.'); return }
    setGuardada(data)
  }

  // ── Éxito ────────────────────────────────────────────────────────────────
  if (guardada) {
    return (
      <main className="cotizar-page" style={{ maxWidth: 520 }}>
        <div className="cotizar-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
          <h2 style={{ margin: '0 0 8px', fontSize: '1.3rem' }}>¡Cotización enviada!</h2>
          <p style={{ color: '#5b6f93', margin: '0 0 4px' }}>
            Para <strong>{guardada.nombre_cliente}</strong>
          </p>
          <p style={{ color: '#9aaabf', fontSize: '0.82rem', marginBottom: 24 }}>
            ID {String(guardada.id).substring(0, 8)} · Te contactaremos a la brevedad.
          </p>
          {!guardada.precios_vigentes && (
            <div className="warning-card" style={{ marginBottom: 20, textAlign: 'left' }}>
              ⚠ Algunos precios tienen más de 48 horas. Te recomendamos verificar.
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn-topbar" onClick={() => generateCotizacionPdf(guardada)}>⬇ Descargar PDF</button>
            <button className="btn-primary" onClick={() => { setGuardada(null); setCarrito([]) }}>↻ Nueva</button>
            {clienteSession && <Link to="/mis-cotizaciones" className="btn-primary">Mis cotizaciones</Link>}
          </div>
        </div>
      </main>
    )
  }

  // ── Formulario ───────────────────────────────────────────────────────────
  return (
    <main className="cotizar-page">
      <div className="cotizar-layout">

        {/* ── Columna principal ── */}
        <div className="cotizar-main-col">

          {/* Tus datos */}
          <div className="cotizar-card">
            <div className="cotizar-card-header">
              <h2>Tus datos</h2>
              {!clienteSession && (
                <span style={{ fontSize: '0.82rem', color: '#5b6f93' }}>
                  ¿Ya tenés cuenta?{' '}
                  <Link to="/login" style={{ color: '#2f6fed', fontWeight: 600, textDecoration: 'none' }}>
                    Iniciá sesión
                  </Link>
                </span>
              )}
            </div>

            {clienteSession && clienteData ? (
              <div className="cliente-card">
                <div className="cliente-card-avatar">
                  {(clienteData.nombre_completo || '?')[0].toUpperCase()}
                </div>
                <div className="cliente-card-info">
                  <strong>{clienteData.nombre_completo}</strong>
                  <span>{clienteData.email}</span>
                </div>
              </div>
            ) : (
              <div className="cotizar-form-grid">
                <div className="cotizar-field cotizar-field-wide">
                  <label>NOMBRE COMPLETO *</label>
                  <input className="input-filtro" placeholder="Tu nombre"
                    value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
                </div>
                <div className="cotizar-field">
                  <label>EMAIL *</label>
                  <input className="input-filtro" placeholder="tu@email.com" type="email"
                    value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="cotizar-field">
                  <label>TELÉFONO</label>
                  <input className="input-filtro" placeholder="Opcional"
                    value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} />
                </div>
              </div>
            )}
          </div>

          {/* Productos seleccionados */}
          {carrito.length > 0 && (
            <div className="cotizar-card">
              <h2 className="cotizar-card-title">Productos seleccionados</h2>
              <ul className="cotizar-cart-list">
                {carrito.map((p, i) => (
                  <li key={i} className="cotizar-cart-item">
                    <div className="cotizar-cart-item-name">
                      {p.nombre}
                      <span className="badge badge-blue" style={{ marginLeft: 8, fontSize: '0.72rem' }}>{p.categoria}</span>
                      {!p.precio_vigente && <span className="stale-badge" style={{ marginLeft: 6 }}>⚠ +48h</span>}
                    </div>
                    <div className="cotizar-cart-item-row">
                      <div className="product-inline-qty">
                        <button onClick={() => p.cantidad === 1 ? eliminar(i) : cambiarCantidad(i, p.cantidad - 1)}>−</button>
                        <span>{p.cantidad}</span>
                        <button onClick={() => cambiarCantidad(i, p.cantidad + 1)}>+</button>
                      </div>
                      <span className="cotizar-cart-item-sub">${p.subtotal.toFixed(2)} {p.moneda}</span>
                      <button className="cotizar-cart-remove" onClick={() => eliminar(i)}>✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Catálogo */}
          <div className="cotizar-card">
            <div className="cotizar-card-header" style={{ marginBottom: 10 }}>
              <h2>Catálogo</h2>
              {busqueda && (
                <button onClick={() => setBusqueda('')}
                  style={{ background: 'none', border: 'none', color: '#9aaabf', cursor: 'pointer', fontSize: '0.82rem' }}>
                  Limpiar ✕
                </button>
              )}
            </div>

            <input
              className="input-filtro"
              placeholder="🔍  Buscar por nombre o SKU..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              autoComplete="off"
              style={{ marginBottom: 8 }}
            />

            <ul className="product-inline-list">
              {productosFiltrados.length === 0 ? (
                <li className="product-inline-empty">Sin resultados para "{busqueda}"</li>
              ) : (
                productosFiltrados.map((p) => {
                  const idx = carrito.findIndex((c) => String(c.producto_id) === String(p.id))
                  const enCarrito = idx >= 0 ? carrito[idx] : null
                  return (
                    <li
                      key={p.id}
                      className={`product-inline-item${enCarrito ? ' in-cart' : ''}`}
                      onClick={() => !enCarrito && agregar(p)}
                    >
                      <div className="product-inline-info">
                        <span className="product-search-name">{p.nombre}</span>
                        <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>{p.categoria}</span>
                      </div>
                      <div className="product-inline-right">
                        <span className="product-search-price">${Number(p.precio).toFixed(2)} {p.moneda}</span>
                        {enCarrito ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {!enCarrito.precio_vigente && (
                              <span className="stale-badge" title="Precio con más de 48 hs">⚠ +48h</span>
                            )}
                            <div className="product-inline-qty" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => enCarrito.cantidad === 1 ? eliminar(idx) : cambiarCantidad(idx, enCarrito.cantidad - 1)}>−</button>
                              <span>{enCarrito.cantidad}</span>
                              <button onClick={() => cambiarCantidad(idx, enCarrito.cantidad + 1)}>+</button>
                            </div>
                          </div>
                        ) : (
                          <button className="product-inline-add" onClick={(e) => { e.stopPropagation(); agregar(p) }}>+ Agregar</button>
                        )}
                      </div>
                    </li>
                  )
                })
              )}
            </ul>
          </div>

        </div>{/* fin cotizar-main-col */}

        {/* ── Sidebar Resumen ── */}
        <aside className="cotizar-sidebar-col">
          <div className="cotizar-card cotizar-resumen-compact">
            <h2>Resumen</h2>

            <div className="cotizar-resumen-row-item">
              <span>Productos</span>
              <span>{totalProductos}</span>
            </div>
            <div className="cotizar-resumen-row-item">
              <span>Unidades</span>
              <span>{totalUnidades}</span>
            </div>

            <div className="cotizar-resumen-total-block">
              <span>Total estimado</span>
              <span>{moneda} {total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>

            {productosAntiguos.length > 0 && (
              <div className="cotizar-warning-block">
                <div className="cotizar-warning-icon">⚠</div>
                <div>
                  <div className="cotizar-warning-title">Precios desactualizados</div>
                  <div className="cotizar-warning-desc">
                    {productosAntiguos.length === 1
                      ? '1 producto tiene precio con más de 48 hs.'
                      : `${productosAntiguos.length} productos con precio +48 hs.`}
                  </div>
                </div>
              </div>
            )}

            <button className="cotizar-submit-btn" onClick={guardar} disabled={guardando || !carrito.length}>
              {guardando ? 'Enviando...' : 'Solicitar cotización'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9aaabf', margin: '8px 0 0' }}>
              Te contactaremos a la brevedad.
            </p>
          </div>
        </aside>

      </div>
    </main>
  )
}
