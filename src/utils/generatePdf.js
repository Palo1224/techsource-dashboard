import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export function generateCotizacionPdf(cotizacion) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const margin = 14
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - margin * 2

  const colors = {
    primary: [29, 49, 93],
    secondary: [47, 111, 237],
    lightBlue: [232, 239, 249],
    border: [220, 228, 240],
    text: [35, 57, 93],
    muted: [107, 124, 152],
    successBg: [215, 243, 227],
    successText: [23, 125, 72],
    warnBg: [255, 247, 232],
    warnBorder: [242, 192, 120],
    warnText: [146, 91, 5],
  }

  let y = 16

  function setText(color = colors.text, size = 10, style = 'normal') {
    doc.setTextColor(...color)
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
  }

  function roundRect(x, yPos, w, h, fillColor = null, drawColor = colors.border) {
    if (fillColor) {
      doc.setFillColor(...fillColor)
      doc.setDrawColor(...drawColor)
      doc.roundedRect(x, yPos, w, h, 3, 3, 'FD')
    } else {
      doc.setDrawColor(...drawColor)
      doc.roundedRect(x, yPos, w, h, 3, 3, 'S')
    }
  }

  function ensureSpace(required) {
    if (y + required > doc.internal.pageSize.getHeight() - 18) {
      doc.addPage()
      y = 16
    }
  }

  function money(value, moneda = 'USD') {
    return `$${Number(value || 0).toFixed(2)} ${moneda}`
  }

  // Parsear productos
  let productos = cotizacion.productos
  if (typeof productos === 'string') {
    try { productos = JSON.parse(productos) } catch { productos = [] }
  }
  if (!Array.isArray(productos)) productos = []
  const productosNoVigentes = productos.filter((p) => p.precio_vigente === false)

  // ── HEADER ──────────────────────────────────────────────
  roundRect(margin, y, contentWidth, 24, [248, 251, 255], colors.border)
  try {
    doc.addImage('/assets/logo.png', 'PNG', margin + 4, y + 3, 28, 18)
  } catch {
    setText(colors.primary, 14, 'bold')
    doc.text('TechSource Solutions', margin + 4, y + 11)
  }
  setText(colors.primary, 16, 'bold')
  doc.text('Cotización', margin + 38, y + 10)
  setText(colors.muted, 9, 'normal')
  doc.text(`ID: ${cotizacion.id}`, margin + 38, y + 16)
  doc.text(
    `Fecha: ${new Date(cotizacion.fecha_creacion).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    margin + 38, y + 21
  )
  y += 32

  // ── DATOS CLIENTE ────────────────────────────────────────
  ensureSpace(28)
  roundRect(margin, y, contentWidth, 24, [255, 255, 255], colors.border)
  setText(colors.primary, 12, 'bold')
  doc.text('Datos del cliente', margin + 4, y + 7)
  setText(colors.muted, 10, 'bold')
  doc.text('Nombre:', margin + 4, y + 15)
  setText(colors.text, 10, 'normal')
  doc.text(cotizacion.nombre_cliente || '', margin + 32, y + 15)
  setText(colors.muted, 10, 'bold')
  doc.text('Email:', margin + 4, y + 21)
  setText(colors.text, 10, 'normal')
  doc.text(cotizacion.email_cliente || '', margin + 32, y + 21)
  y += 30

  // ── TABLA PRODUCTOS (con jspdf-autotable) ────────────────
  ensureSpace(20)
  setText(colors.primary, 12, 'bold')
  doc.text('Detalle de cotización', margin, y)
  y += 5

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Producto', 'Categoría', 'Proveedor', 'Precio Unit.', 'Cant.', 'Subtotal']],
    body: productos.map((p) => [
      (p.precio_vigente === false ? '⚠ ' : '') + (p.nombre || ''),
      p.categoria || '',
      p.proveedor || '',
      money(p.precio_unitario, p.moneda),
      String(p.cantidad || 1),
      money(p.subtotal, p.moneda),
    ]),
    foot: [['', '', '', '', 'TOTAL', money(cotizacion.total, 'USD')]],
    headStyles: {
      fillColor: colors.lightBlue,
      textColor: colors.primary,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: colors.text },
    footStyles: {
      fillColor: [248, 251, 255],
      textColor: colors.primary,
      fontStyle: 'bold',
      fontSize: 10,
    },
    didParseCell(data) {
      if (data.section === 'body') {
        const prod = productos[data.row.index]
        if (prod?.precio_vigente === false) {
          data.cell.styles.textColor = colors.warnText
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
    alternateRowStyles: { fillColor: [252, 254, 255] },
    tableLineColor: colors.border,
    tableLineWidth: 0.1,
  })

  y = doc.lastAutoTable.finalY + 10

  // ── AVISO VIGENCIA ───────────────────────────────────────
  ensureSpace(20)
  if (productosNoVigentes.length) {
    roundRect(margin, y, contentWidth, 22, colors.warnBg, colors.warnBorder)
    setText(colors.warnText, 10, 'bold')
    doc.text('⚠ Atención: precios desactualizados', margin + 4, y + 7)
    setText(colors.warnText, 9, 'normal')
    const nota = `Productos: ${productosNoVigentes.map((p) => p.nombre).join(', ')}. Verificar con proveedor.`
    doc.text(doc.splitTextToSize(nota, contentWidth - 10), margin + 4, y + 14)
    y += 28
  } else {
    roundRect(margin, y, contentWidth, 12, colors.successBg, colors.border)
    setText(colors.successText, 9, 'bold')
    doc.text('✓ Todos los precios están vigentes al momento de la emisión.', margin + 4, y + 8)
    y += 18
  }

  // ── FOOTER ───────────────────────────────────────────────
  const pageHeight = doc.internal.pageSize.getHeight()
  setText(colors.muted, 8, 'normal')
  doc.text('Cotización generada automáticamente por TechSource Solutions', margin, pageHeight - 10)
  doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, margin, pageHeight - 6)

  doc.save(`Cotizacion_TechSource_${cotizacion.id}.pdf`)
}
