// Modal para crear una nueva cotización desde la zona admin
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import Modal from './Modal'
import { esPrecioVigente } from '../utils/helpers'
import { generateCotizacionPdf } from '../utils/generatePdf'

export default function QuoteModal({ onClose, onSaved }) {
  const [catalogo, setCatalogo] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [selectValue, setSelectValue] = useState('')
  const [carrito, setCarrito] = useState([])
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteEmail, setClienteEmail] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [guardada, setGuardada] = useState(null)

  useEffect(() => {
    supabase
      .from('catalogo_proveedores')
      .select('*')
      .eq('vigente', true)
      .order('nombre', { ascending: true })
      .then(({ data }) => setCatalogo(data || []))
  }, [])

  const productosFiltrados = useMemo(() =>
    busqueda.trim()
      ? catalogo.filter((p) => p.nombre?.toLowerCase().includes(busqueda.toLowerCase()))
      : catalogo,
    [catalogo, busqueda]
  )

  function agregar(id) {
    if (!id) return
    const producto = catalogo.find((p) => String(p.id) === String(id))
    if (!producto) return
    setCarrito((prev) => {
      const ex = prev.find((p) => String(p.producto_id) === String(producto.id))
      if (ex) {
        return prev.map((p) =>
          String(p.producto_id) === String(producto.id)
            ? { ...p, cantidad: p.cantidad + 1, subtotal: (p.cantidad + 1) * p.precio_unitario }
            : p
        )
      }
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
        fecha_sync: producto.fecha_sync,
      }]
    })
    setSelectValue('')
  }

  function cambiarCantidad(i, val) {
    const cantidad = Math.max(1, parseInt(val) || 1)
    setCarrito((prev) => prev.map((p, idx) =>
      idx === i ? { ...p, cantidad, subtotal: cantidad * p.precio_unitario } : p
    ))
  }

  function eliminar(i) {
    setCarrito((prev) => prev.filter((_, idx) => idx !== i))
  }

  const total = carrito.reduce((acc, p) => acc + p.subtotal, 0)
  const productosAntiguos = carrito.filter((p) => !p.precio_vigente)

  async function guardar() {
    if (!clienteNombre.trim() || !clienteEmail.trim()) {
      alert('Completá nombre y email del cliente.')
      return
    }
    if (!carrito.length) {
      alert('Agregá al menos un producto.')
      return
    }
    setGuardando(true)
    const { data, error } = await supabase
      .from('cotizaciones')
      .insert([{
        nombre_cliente: clienteNombre,
        email_cliente: clienteEmail,
        productos: carrito.map(({ nombre, cantidad, subtotal, categoria, proveedor, producto_id, precio_unitario, moneda, precio_vigente }) =>
          ({ nombre, cantidad, subtotal, categoria, proveedor, producto_id, precio_unitario, moneda, precio_vigente })
        ),
        total,
        fecha_creacion: new Date().toISOString(),
        estado: 'emitida',
        precios_vigentes: carrito.every((p) => p.precio_vigente),
      }])
      .select()
      .single()
    setGuardando(false)
    if (error) { alert('Error al guardar.'); return }
    setGuardada(data)
    onSaved?.()
  }

  if (guardada) {
    return (
      <Modal title="Cotización generada" onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ fontSize: 56, color: '#2da66b' }}>◌</div>
          <h3 style={{ margin: '12px 0 6px' }}>¡Guardada exitosamente!</h3>
          <p style={{ color: '#6a7d9c', margin: 0 }}>
            Cliente: <strong>{guardada.nombre_cliente}</strong>
            <br />ID: <code>{String(guardada.id).substring(0, 8)}</code>
          </p>
          {!guardada.precios_vigentes && (
            <p style={{ color: '#925b05', marginTop: 12, fontSize: '0.88rem' }}>
              ⚠ Algunos precios tienen más de 48 horas. Verificar con proveedor.
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20 }}>
            <button className="btn-topbar" onClick={() => generateCotizacionPdf(guardada)}>
              ⬇ PDF
            </button>
            <button className="btn-primary" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Nueva cotización" onClose={onClose} maxWidth={780}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Datos cliente */}
        <div className="filtros-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label className="label-form">Nombre del cliente</label>
            <input className="input-filtro" placeholder="Empresa ABC" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} />
          </div>
          <div>
            <label className="label-form">Email</label>
            <input className="input-filtro" placeholder="cliente@ejemplo.com" value={clienteEmail} onChange={(e) => setClienteEmail(e.target.value)} />
          </div>
        </div>

        {/* Buscador */}
        <div className="filtros-grid" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
          <input className="input-filtro" placeholder="Buscar producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <select className="input-filtro" value={selectValue} onChange={(e) => { setSelectValue(e.target.value); agregar(e.target.value) }}>
            <option value="">Seleccionar...</option>
            {productosFiltrados.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre} — ${Number(p.precio).toFixed(2)}</option>
            ))}
          </select>
        </div>

        {/* Advertencia */}
        {productosAntiguos.length > 0 && (
          <div className="card warning-card" style={{ padding: '10px 14px' }}>
            ⚠ Precios desactualizados: {productosAntiguos.map((p) => p.nombre).join(', ')}
          </div>
        )}

        {/* Tabla carrito */}
        {carrito.length > 0 && (
          <div className="tabla-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th><th>Precio</th><th>Cant.</th><th>Subtotal</th><th></th>
                </tr>
              </thead>
              <tbody>
                {carrito.map((p, i) => (
                  <tr key={i}>
                    <td>{p.nombre}{!p.precio_vigente && <span className="warn-inline">⚠</span>}</td>
                    <td className={!p.precio_vigente ? 'stale-price' : ''}>${p.precio_unitario.toFixed(2)}</td>
                    <td><input type="number" min="1" value={p.cantidad} className="qty-input" onChange={(e) => cambiarCantidad(i, e.target.value)} /></td>
                    <td>${p.subtotal.toFixed(2)}</td>
                    <td><button className="btn-icon" onClick={() => eliminar(i)}>🗑</button></td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right' }}><strong>Total</strong></td>
                  <td><strong>${total.toFixed(2)}</strong></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-topbar" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando...' : '✈ Generar Cotización'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
