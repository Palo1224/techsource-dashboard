# TechSource Solutions — Documentación del Frontend

Plataforma de **Supplier Sync & Smart Pricing**: sincroniza precios de proveedores, genera cotizaciones y permite a clientes gestionarlas en línea.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Vite + React 18 |
| Routing | react-router-dom v6 |
| Base de datos / Auth | Supabase (PostgreSQL + Auth) |
| PDF | jsPDF + jspdf-autotable |
| Estilos | CSS plano con variables (`src/styles/global.css`) |

---

## Roles

### 👤 Cliente

Accede por: **`/login`** (pantalla blanca, sólo email — sin contraseña)

El sistema busca al cliente en la tabla `clientes` por email. Si existe, inicia sesión automáticamente. Si no existe, se crea al solicitar la primera cotización.

#### Páginas disponibles

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/catalogo` | Catálogo público | Ve todos los productos activos con precio de venta. Puede hacer click en un producto para ver su detalle (imagen, descripción, SKU, precio). |
| `/cotizar` | Solicitar cotización | Selecciona productos del catálogo, ajusta cantidades y solicita una cotización. Si ya inició sesión, sus datos se cargan automáticamente. |
| `/mis-cotizaciones` | Mis cotizaciones | Ve el historial de sus cotizaciones. Puede aceptar o rechazar las que están en estado **Emitida**. Puede descargar el PDF de cada una. |

#### Flujo del cliente

1. Entra al catálogo → busca y explora productos
2. Va a `/cotizar` → agrega productos al carrito
3. Completa sus datos (nombre, email, teléfono) o inicia sesión
4. Hace click en **Solicitar cotización** → se guarda en Supabase con estado `emitida`
5. El admin revisa y puede cambiar el estado
6. El cliente entra a **Mis cotizaciones** y ve el estado
7. Si la cotización está **Emitida**, puede **Aceptar** o **Rechazar** con confirmación
8. Puede descargar el PDF (sin columna de Proveedor)

#### Alertas de precios desactualizados

Cuando un precio tiene más de 48 horas sin actualización, el sistema muestra:
- En el carrito: banner amarillo con texto explicativo por producto
- En el resumen: aviso "Precios desactualizados — X productos con precio +48 hs."
- En el PDF: sección de advertencia con los nombres de los productos afectados

---

### 🛠️ Administrador

Accede por: **`/ts-panel/auth`** — *enlace oculto en el footer del sitio público* (easter egg: hacer click sobre el texto del copyright)

Requiere usuario con `user_metadata.role = "admin"` en Supabase → Authentication → Users → Edit user.

#### Páginas disponibles

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/dashboard` | Dashboard | KPIs generales: productos vigentes, proveedores activos, cotizaciones emitidas y aprobadas. Gráfico de historial de precios. |
| `/admin/catalogo` | Catálogo (admin) | Tabla completa del catálogo con precio costo y precio venta. Click en una fila abre modal con detalle completo: imagen, descripción, SKU, stock, proveedor, ambos precios. Puede activar/desactivar productos con confirmación. |
| `/historial` | Historial de precios | Registro de todos los cambios de precios detectados por la sincronización (SKU, proveedor, precio anterior, precio nuevo, fecha). |
| `/cotizaciones` | Cotizaciones | Todas las cotizaciones del sistema con filtros por cliente/ID, estado, fecha y validación de precios. Puede cambiar el estado (En espera / Emitida / Aprobada / Vencida) desde la tabla o desde el detalle. Puede descargar PDF con columna de Proveedor (con badges de color por proveedor). |
| `/clientes` | Clientes | Lista de clientes registrados. Puede habilitar/bloquear clientes con confirmación. Puede ver/editar datos del cliente en un modal. |

#### Crear una cotización desde el panel admin

Desde `/cotizaciones` → botón **+ Nueva cotización** → abre el modal `QuoteModal`:
1. Ingresa nombre y email del cliente
2. Busca y agrega productos del catálogo
3. Ajusta cantidades
4. Genera cotización → queda con estado `emitida`

---

## Estados de una cotización

| Estado | Quién lo asigna | Descripción |
|--------|----------------|-------------|
| `emitida` | Sistema (al crear) | Cotización generada, pendiente de respuesta |
| `en_espera` | Admin | En proceso de revisión |
| `aprobada` | Cliente o Admin | Cotización aceptada |
| `rechazada` | Cliente | Cotización rechazada por el cliente |
| `vencida` | Admin | Cotización expirada |

---

## Sincronización de precios

Los precios se sincronizan desde proveedores externos (DummyJSON, GoogleSheets, Mockaroo) mediante un proceso externo (n8n). Cuando un precio cambia:
- Se registra en `historial_precios`
- Se actualiza `fecha_sync` en `catalogo_proveedores`

Si un precio tiene más de **48 horas** sin sincronización, se considera **desactualizado** y se marca visualmente en toda la plataforma.

---

## PDFs

Los PDFs se generan en el cliente con jsPDF. Contienen:
- Encabezado con logo y datos de la cotización
- Datos del cliente
- Tabla de productos
- Fila de total
- Aviso de precios desactualizados (si aplica)
- Footer con validez de 15 días y datos de contacto

**Diferencia por rol:**
- **Cliente**: PDF sin columna Proveedor
- **Admin**: PDF con columna Proveedor y badges de color por proveedor

---

## Vistas de Supabase utilizadas

| Vista | Descripción |
|-------|-------------|
| `vista_catalogo_proveedores` | Catálogo con datos del proveedor unidos (nombre, email). Incluye `precio_venta`. |
| `vista_cotizaciones_clientes` | Cotizaciones con datos del cliente unidos. |

> Las vistas son de solo lectura. Los INSERT/UPDATE siempre van a las tablas originales (`cotizaciones`, `catalogo_proveedores`, `clientes`).
