import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export function generateCotizacionPdf(cotizacion, { isAdmin = false } = {}) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth  = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentWidth = pageWidth - margin * 2

  const navy      = [29,  49,  93]
  const blue      = [47, 111, 237]
  const muted     = [107, 124, 152]
  const textColor = [35,  57,  93]
  const border    = [220, 228, 240]
  const warnBg    = [255, 247, 232]
  const warnBord  = [242, 192, 120]
  const warnText  = [170,  95,  10]
  const warnTitle = [211,  84,   0]

  // ── parse productos ─────────────────────────────────────
  let productos = cotizacion.productos
  if (typeof productos === 'string') { try { productos = JSON.parse(productos) } catch { productos = [] } }
  if (!Array.isArray(productos)) productos = (typeof productos === 'object' && productos) ? Object.values(productos) : []
  const noVigentes = productos.filter(p => p.precio_vigente === false)

  // ── provider badge colors ────────────────────────────────
  const provColors = {}
  const palette = [[47,111,237],[45,166,107],[142,68,173],[211,84,0],[41,128,185]]
  let pi = 0
  function provColor(name) {
    if (!name) return [150,150,150]
    if (!provColors[name]) { provColors[name] = palette[pi % palette.length]; pi++ }
    return provColors[name]
  }

  let y = 0

  // ── HEADER ──────────────────────────────────────────────
  const headerH = 38
  doc.setFillColor(...navy)
  doc.rect(0, 0, pageWidth, headerH, 'F')

  // Left: branding
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('TECHSOURCE', margin, 13)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(160, 190, 230)
  doc.text('— S U P P L I E R —', margin, 19)

  doc.setFontSize(7)
  doc.setTextColor(130, 165, 210)
  doc.text('P A R T S  ·  D E V I C E S  ·  S T O R A G E', margin, 24)

  // Right: title + id + date
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.text('Cotización', pageWidth - margin, 20, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(160, 190, 230)
  doc.text(`ID: ${cotizacion.id}`, pageWidth - margin, 27, { align: 'right' })

  const fecha = new Date(cotizacion.fecha_creacion).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text(fecha, pageWidth - margin, 34, { align: 'right' })

  y = headerH + 10

  // ── DATOS CLIENTE ────────────────────────────────────────
  const clientH = 24
  // blue left accent
  doc.setFillColor(...blue)
  doc.rect(margin, y, 3, clientH, 'F')
  // box
  doc.setFillColor(248, 251, 255)
  doc.setDrawColor(...border)
  doc.setLineWidth(0.3)
  doc.rect(margin + 3, y, contentWidth - 3, clientH, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...muted)
  doc.text('DATOS DEL CLIENTE', margin + 7, y + 6)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...muted)
  doc.text('NOMBRE', margin + 7, y + 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...textColor)
  doc.text(cotizacion.nombre_cliente || '', margin + 28, y + 13)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...muted)
  doc.text('EMAIL', margin + 7, y + 20)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...textColor)
  doc.text(cotizacion.email_cliente || '', margin + 28, y + 20)

  y += clientH + 10

  // ── SECTION HEADING ─────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...navy)
  doc.text('Detalle de cotización', margin, y)
  doc.setDrawColor(...border)
  doc.setLineWidth(0.4)
  doc.line(margin + 52, y - 1, pageWidth - margin, y - 1)
  y += 5

  // ── TABLE ────────────────────────────────────────────────
  const headCols = isAdmin
    ? ['PRODUCTO', 'CATEGORÍA', 'PROVEEDOR', 'PRECIO UNIT.', 'CANT.', 'SUBTOTAL']
    : ['PRODUCTO', 'CATEGORÍA', 'PRECIO UNIT.', 'CANT.', 'SUBTOTAL']

  const bodyRows = productos.map(p => isAdmin
    ? [p.nombre || '', p.categoria || '', p.proveedor || '', `$${Number(p.precio_unitario || 0).toFixed(0)}`, String(p.cantidad || 1), `$${Number(p.subtotal || 0).toFixed(0)}`]
    : [p.nombre || '', p.categoria || '', `$${Number(p.precio_unitario || 0).toFixed(0)}`, String(p.cantidad || 1), `$${Number(p.subtotal || 0).toFixed(0)}`]
  )

  const totalStr = `$${Number(cotizacion.total || 0).toFixed(0)}`
  const footRow = isAdmin
    ? [{ content: 'TOTAL', colSpan: 5, styles: { halign: 'right' } }, totalStr]
    : [{ content: 'TOTAL', colSpan: 4, styles: { halign: 'right' } }, totalStr]

  // column indices shift when proveedor is hidden
  const priceColIdx  = isAdmin ? 3 : 2
  const totalColIdx  = isAdmin ? 5 : 4
  const provColIdx   = isAdmin ? 2 : -1

  const colStyles = isAdmin
    ? {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 24 },
        2: { cellWidth: 34 },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 36, halign: 'right', fontStyle: 'bold' },
      }
    : {
        0: { cellWidth: 66, fontStyle: 'bold' },
        1: { cellWidth: 34 },
        2: { cellWidth: 36, halign: 'right' },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [headCols],
    body: bodyRows,
    foot: [footRow],
    headStyles: {
      fillColor: navy,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 9,
      textColor: textColor,
      cellPadding: { top: 7, bottom: 7, left: 4, right: 4 },
      minCellHeight: 14,
    },
    footStyles: {
      fillColor: navy,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 13,
      cellPadding: { top: 6, bottom: 6, left: 4, right: 4 },
    },
    columnStyles: colStyles,
    didParseCell(data) {
      if (data.section === 'body') {
        const prod = productos[data.row.index]
        if (data.column.index === provColIdx) data.cell.styles.textColor = [255, 255, 255]
        if (prod?.precio_vigente === false && (data.column.index === priceColIdx || data.column.index === totalColIdx)) {
          data.cell.styles.textColor = warnTitle
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
    didDrawCell(data) {
      if (isAdmin && data.section === 'body' && data.column.index === provColIdx) {
        const rawProv = productos[data.row.index]?.proveedor
        if (!rawProv) return
        const color = provColor(rawProv)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        // Truncate if badge would overflow cell
        const maxBw = data.cell.width - 6
        let label = rawProv
        while (label.length > 3 && doc.getTextWidth(label) + 6 > maxBw) {
          label = label.slice(0, -1)
        }
        if (label !== rawProv) label = label.slice(0, -1) + '…'
        const bw = Math.min(doc.getTextWidth(label) + 6, maxBw)
        const bx = data.cell.x + 3
        const by = data.cell.y + (data.cell.height - 6) / 2
        doc.setFillColor(...color)
        doc.roundedRect(bx, by, bw, 6, 2, 2, 'F')
        doc.setTextColor(255, 255, 255)
        doc.text(label, bx + bw / 2, by + 4.3, { align: 'center' })
      }
    },
    alternateRowStyles: { fillColor: [252, 254, 255] },
    tableLineColor: border,
    tableLineWidth: 0.1,
    showFoot: 'lastPage',
  })

  y = doc.lastAutoTable.finalY + 10

  // ── AVISO PRECIOS DESACTUALIZADOS ────────────────────────
  if (noVigentes.length) {
    const nombres = noVigentes.map(p => p.nombre).join(' · ')
    const bodyLines = doc.splitTextToSize(nombres, contentWidth - 24)
    const boxH = 8 + 5 + bodyLines.length * 5 + 4

    doc.setFillColor(...warnBg)
    doc.setDrawColor(...warnBord)
    doc.setLineWidth(0.4)
    doc.roundedRect(margin, y, contentWidth, boxH, 3, 3, 'FD')

    doc.setFillColor(...warnTitle)
    doc.roundedRect(margin, y, 3.5, boxH, 1.5, 1.5, 'F')

    // Triangle icon
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...warnTitle)
    doc.text('!', margin + 9, y + 9)
    // Circle around it
    doc.setDrawColor(...warnTitle)
    doc.setLineWidth(0.7)
    doc.circle(margin + 9, y + 7, 4, 'S')

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...warnTitle)
    doc.text('PRECIOS DESACTUALIZADOS', margin + 17, y + 8)

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...warnText)
    doc.text('Verificar precio con el proveedor antes de confirmar:', margin + 7, y + 14)

    doc.setFont('helvetica', 'bold')
    doc.text(bodyLines, margin + 7, y + 19)

    y += boxH + 10
  }

  // ── FOOTER ───────────────────────────────────────────────
  const footY = pageHeight - 18
  doc.setDrawColor(...border)
  doc.setLineWidth(0.3)
  doc.line(margin, footY - 4, pageWidth - margin, footY - 4)

  // Left: company + pill
  doc.setTextColor(...navy)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('TechSource Supplier', margin, footY + 2)

  // Pill VÁLIDO POR 15 DÍAS
  const pillX = margin + 44
  const pillW = 36
  doc.setFillColor(232, 239, 249)
  doc.setDrawColor(...blue)
  doc.setLineWidth(0.5)
  doc.roundedRect(pillX, footY - 3, pillW, 7, 3, 3, 'FD')
  doc.setTextColor(...blue)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.text('VÁLIDO POR 15 DÍAS', pillX + pillW / 2, footY + 2, { align: 'center' })

  // Right: contact
  doc.setTextColor(...muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('parts@techsource.com', pageWidth - margin, footY, { align: 'right' })
  doc.text('www.techsource.com', pageWidth - margin, footY + 5, { align: 'right' })

  doc.save(`Cotizacion_TechSource_${String(cotizacion.id).substring(0, 8)}.pdf`)
}
