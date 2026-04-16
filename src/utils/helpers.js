export function shortId(id) {
  if (!id) return ''
  return String(id).substring(0, 8)
}

export function formatearMoneda(valor) {
  const num = Number(valor || 0)
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function formatearFecha(fecha) {
  if (!fecha) return ''
  return new Date(fecha).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function esPrecioVigente(fechaSync) {
  if (!fechaSync) return false
  const diffHoras = (new Date() - new Date(fechaSync)) / (1000 * 60 * 60)
  return diffHoras <= 48
}

export function getUltimaSync(data) {
  return data
    .map((x) => x.fecha_sync)
    .filter(Boolean)
    .sort()
    .reverse()[0]
}
