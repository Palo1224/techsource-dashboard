// paginate(data, page, size) — export nombrado para uso en páginas
export function paginate(data, page, size) {
  const start = (page - 1) * size
  return data.slice(start, start + size)
}

// Componente de paginación
export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  label = 'registros',
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = Math.min((page - 1) * pageSize + 1, total)
  const to = Math.min(page * pageSize, total)

  return (
    <div className="pagination">
      <span className="pagination-info">
        {total === 0 ? 'Sin resultados' : `${from}–${to} de ${total} ${label}`}
      </span>

      <div className="pagination-controls">
        <select
          className="pagination-size"
          value={pageSize}
          onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1) }}
        >
          {[10, 25, 50, 100].map((s) => (
            <option key={s} value={s}>{s} / pág</option>
          ))}
        </select>

        <button
          className="pagination-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          ←
        </button>

        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p
          if (totalPages <= 5) p = i + 1
          else if (page <= 3) p = i + 1
          else if (page >= totalPages - 2) p = totalPages - 4 + i
          else p = page - 2 + i
          return (
            <button
              key={p}
              className={`pagination-btn${p === page ? ' active' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        })}

        <button
          className="pagination-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          →
        </button>
      </div>
    </div>
  )
}
