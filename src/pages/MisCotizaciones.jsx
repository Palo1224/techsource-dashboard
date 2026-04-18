import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Table from '../components/Table'
import Modal from '../components/Modal'
import Pagination, { paginate } from '../components/Pagination'
import { shortId, formatearMoneda, formatearFecha } from '../utils/helpers'
import { generateCotizacionPdf } from '../utils/generatePdf'
import { parseProductos } from './Cotizaciones'

const ESTADO_BADGE = {
  en_espera: 'badge-yellow',
  emitida:   'badge-blue',
  aprobada:  'badge-green',
  rechazada: 'badge-red',
  vencida:   'badge-gray',
}
const ESTADO_LABEL = {
  en_espera: 'En espera',
  emitida:   'Emitida',
  aprobada:  'Aprobada',
  rechazada: 'Rechazada',
  vencida:   'Vencida',
}

export default function MisCotizaciones({ clienteSession }) {
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [detalle, setDetalle] = useState(null)
  const [confirmando, setConfirmando] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    const email = clienteSession?.email
    if (!email) return
    supabase
      .from('vista_cotizaciones_clientes')
      .select('*')
      .ilike('email_cliente', email)
      .order('fecha_creacion', { ascending: false })
      .then(({ data }) => { setCotizaciones(data || []); setLoading(false) })
  }, [clienteSession])

  async function cambiarEstado(id, nuevoEstado) {
    await supabase.from('cotizaciones').update({ estado: nuevoEstado }).eq('id', id)
    setCotizaciones((prev) =>
      prev.map((c) => c.id === id ? { ...c, estado: nuevoEstado } : c)
    )
    if (detalle?.id === id) setDetalle((prev) => ({ ...prev, estado: nuevoEstado }))
  }

  const paginated = paginate(cotizaciones, page, pageSize)

  const columns = [
    { key: 'id', label: 'ID', render: (r) => shortId(r.id) },
    { key: 'total', label: 'Total', render: (r) => <strong>{formatearMoneda(r.total)}</strong> },
    { key: 'fecha_creacion', label: 'Fecha', render: (r) => formatearFecha(r.fecha_creacion) },
    { key: 'estado', label: 'Estado', render: (r) => (
      <span className={`badge ${ESTADO_BADGE[r.estado] || 'badge-gray'}`}>
        {ESTADO_LABEL[r.estado] || r.estado}
      </span>
    )},
    { key: 'precios_vigentes', label: 'Validación', render: (r) =>
      r.precios_vigentes
        ? <span className="badge badge-green">◔ Vigentes</span>
        : <span className="badge badge-yellow">⚠ Verificar</span>
    },
    { key: 'acciones', label: '', render: (r) => (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {r.estado === 'emitida' && (
          <>
            <button className="btn-icon" title="Aceptar" style={{ color: '#2da66b' }} onClick={() => setConfirmando({ cotizacion: r, accion: 'aprobada' })}>✓</button>
            <button className="btn-icon" title="Rechazar" style={{ color: '#E74C3C' }} onClick={() => setConfirmando({ cotizacion: r, accion: 'rechazada' })}>✕</button>
          </>
        )}
        <button className="btn-icon" title="Ver" onClick={() => setDetalle(r)}>👁</button>
        <button className="btn-icon" title="PDF" onClick={() => generateCotizacionPdf(r)}>⬇</button>
      </div>
    )},
  ]

  return (
    <main className="container">
      <section className="card" style={{ marginBottom: 14 }}>
        <h1 className="page-title">Mis Cotizaciones</h1>
        <p className="page-subtitle">{cotizaciones.length} cotización(es) registradas</p>
      </section>

      <section className="card">
        <Table columns={columns} data={paginated} loading={loading} emptyMessage="Todavía no tenés cotizaciones." />
        <Pagination page={page} pageSize={pageSize} total={cotizaciones.length} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1) }} label="cotizaciones" />
      </section>

      {detalle && (
        <DetalleModal
          cotizacion={detalle}
          onClose={() => setDetalle(null)}
          onCambiarEstado={cambiarEstado}
        />
      )}

      {confirmando && (
        <div className="modal-backdrop" onClick={() => setConfirmando(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-modal-msg">
              {confirmando.accion === 'aprobada'
                ? <>¿Deseás <strong>aceptar</strong> esta cotización?</>
                : <>¿Deseás <strong>rechazar</strong> esta cotización?</>
              }
            </p>
            <div style={{ background: '#f4f7fb', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.88rem', color: '#1d315d', lineHeight: 1.8 }}>
              <div><span style={{ color: '#6b7c98' }}>ID:</span> <strong>{shortId(confirmando.cotizacion.id)}</strong></div>
              <div><span style={{ color: '#6b7c98' }}>Total:</span> <strong>{formatearMoneda(confirmando.cotizacion.total)}</strong></div>
              <div><span style={{ color: '#6b7c98' }}>Fecha:</span> {formatearFecha(confirmando.cotizacion.fecha_creacion)}</div>
            </div>
            <div className="confirm-modal-actions">
              <button className="confirm-modal-cancel" onClick={() => setConfirmando(null)}>
                Cancelar
              </button>
              <button
                className="confirm-modal-ok"
                style={{ background: confirmando.accion === 'aprobada' ? '#2da66b' : '#E74C3C' }}
                onClick={() => { cambiarEstado(confirmando.cotizacion.id, confirmando.accion); setConfirmando(null) }}
              >
                {confirmando.accion === 'aprobada' ? '✓ Sí, aceptar' : '✕ Sí, rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function DetalleModal({ cotizacion, onClose, onCambiarEstado }) {
  const productos = parseProductos(cotizacion.productos)
  return (
    <Modal title="Detalle de cotización" onClose={onClose} maxWidth={760}>
      <div style={{ marginBottom: 12 }}>
        <p style={{ margin: '0 0 4px' }}><strong>Total:</strong> {formatearMoneda(cotizacion.total)}</p>
        <p style={{ margin: '0 0 4px' }}><strong>Fecha:</strong> {formatearFecha(cotizacion.fecha_creacion)}</p>
        <p style={{ margin: 0 }}>
          <strong>Estado:</strong>{' '}
          <span className={`badge ${ESTADO_BADGE[cotizacion.estado] || 'badge-gray'}`}>
            {ESTADO_LABEL[cotizacion.estado] || cotizacion.estado}
          </span>
        </p>
      </div>


      <div className="tabla-wrapper">
        <table className="table">
          <thead>
            <tr><th>Producto</th><th>Cantidad</th><th>Precio Unit.</th><th>Subtotal</th></tr>
          </thead>
          <tbody>
            {productos.map((p, i) => (
              <tr key={i}>
                <td>{p.nombre}</td>
                <td>{p.cantidad}</td>
                <td>${Number(p.precio_unitario || 0).toFixed(0)}</td>
                <td>${Number(p.subtotal || 0).toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn-topbar" onClick={() => generateCotizacionPdf(cotizacion)}>⬇ PDF</button>
      </div>
    </Modal>
  )
}
