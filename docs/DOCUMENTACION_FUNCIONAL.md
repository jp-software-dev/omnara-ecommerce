# Documentación funcional — Omnara E-Commerce

> Qué hace Omnara desde la perspectiva de cada tipo de usuario, y qué reglas de negocio gobiernan cada flujo. Complementa a `DOCUMENTACION_TECNICA.md` (cómo está construido).

## 1. Visión general

Omnara es un **marketplace multicategoría** (ropa, calzado, electrónica, accesorios y hogar) donde varios negocios independientes (estudiantes) venden bajo un mismo catálogo, un mismo carrito y un mismo checkout. Tiene tres tipos de usuario (cliente, vendedor, administrador), pagos vía Stripe (en modo de prueba, sin cargos reales), gestión de inventario, promociones, envío, facturación, soporte al cliente y analítica de ventas. Interfaz bilingüe (español/inglés) y multimoneda (MXN/USD).

### Negocios (vendedores)

- Cada vendedor tiene un **negocio** con nombre, descripción, logo y banner, y una **vitrina pública** en `/negocio/[slug]`. El directorio de todos los negocios activos está en `/negocios`.
- **Un negocio por dueño.**
- **Alta:** el estudiante se registra como cliente normal; un administrador crea su negocio desde `/admin/negocios` y, en ese mismo paso, la cuenta pasa a rol vendedor. No se puede elegir a un administrador como dueño.
- **Autogestión:** el vendedor edita el branding de su negocio en `/admin/mi-negocio`; solo puede modificar el suyo.
- **"Vendido por":** la ficha de cada producto indica qué negocio lo vende y enlaza a su vitrina.
- **Pausar un negocio:** al desactivarlo desaparecen su vitrina y sus productos (home, categorías, búsqueda y más vendidos).
- **Carrito mixto:** un carrito puede mezclar productos de varios negocios; se paga en una sola sesión de Stripe y genera un solo pedido. Cada vendedor ve solo los pedidos que contienen sus artículos.

## 2. Roles de usuario

| Rol | Quién es | Qué puede hacer además de comprar |
|---|---|---|
| **Cliente** (`customer`) | Cualquiera que se registra, o navega como invitado | Comprar, ver su historial de pedidos, dejar reseñas, guardar favoritos |
| **Vendedor** (`vendor`) | Dueño de un negocio; gestiona sus propios productos | Todo lo del cliente + panel: su negocio, sus productos, su inventario, pedidos donde tiene algún ítem vendido (sin poder cambiar el estado) |
| **Administrador** (`admin`) | Operador de la plataforma | Todo lo anterior sobre **cualquier** vendedor/producto/pedido, además de: alta y edición de negocios, gestión de usuarios y roles, mensajes de contacto, códigos promocionales, analítica completa, cambiar el estado de cualquier pedido |

Los roles se asignan desde `/admin/usuarios` (solo admin) — antes de esta funcionalidad, solo se podían cambiar directamente en la base de datos.

**Nadie puede comprar y no puede haber invitados anónimos que naveguen sin restricción:** en realidad sí — la compra y navegación del catálogo **no requieren cuenta**. Solo se pide iniciar sesión para: ver `/cuenta`, dejar una reseña, o entrar al panel admin/vendedor.

## 3. Catálogo

- 5 categorías fijas: Ropa, Calzado, Electrónica, Accesorios, Hogar (bilingües, con imagen representativa tomada del producto activo más reciente de cada una).
- Cada producto tiene: nombre y descripciones (corta/larga) en ES/EN, precio base en MXN, estado (borrador / activo / archivado — solo "activo" es visible al público), marca destacada opcional, y **atributos específicos según su categoría** (ver tabla abajo) — el mismo producto de "Ropa" no pide los mismos campos que uno de "Electrónica".

| Categoría | Atributos propios |
|---|---|
| Ropa | Material, Género, Temporada |
| Calzado | Material, Género, Tipo de suela |
| Electrónica | Marca, Modelo, Año, Garantía (meses) |
| Accesorios | Marca, Material |
| Hogar | Marca, Material, Dimensiones |

- Cada producto tiene **variantes** (SKU real): combinación de talla/color, cada una con su propio stock y, opcionalmente, un precio distinto al base.
- **Guía de tallas:** muestra el rango canónico completo de la categoría (calzado CM 22–29, ropa XS–XL) aunque el producto no tenga todas esas tallas dadas de alta — las que no existen se muestran deshabilitadas/tachadas ("agotado"), en vez de simplemente no aparecer.

## 4. Descubrimiento de producto

- **Búsqueda** en vivo (`/buscar`), por nombre en cualquiera de los dos idiomas.
- **Home:** carrusel por categoría, "Lo más nuevo", "Destacados" (marcados manualmente por un admin/vendor), y "Más vendidos" (calculado en tiempo real a partir de las ventas reales).
- **Ficha de producto:** galería con zoom/lightbox y navegación por teclado, selector de talla/color, contador de urgencia de stock, acordeón de Descripción / Envíos y devoluciones / Características, productos relacionados (carrusel horizontal, misma categoría), y reseñas.
- **Favoritos (wishlist):** botón de corazón en cualquier tarjeta o ficha de producto; visible en `/cuenta`.

## 5. Reseñas de producto

- Estrellas 1–5, título y comentario opcionales.
- **Una reseña por cliente por producto** (no se puede reseñar dos veces el mismo producto).
- Cualquier usuario con sesión puede reseñar un producto; la reseña **aún no se valida contra una compra real** (la marca "compra verificada" existe en el modelo pero no se asigna automáticamente — ver §13).
- Promedio de calificación visible en la ficha del producto.
- En el detalle de un pedido ya **enviado**, la tienda invita activamente a dejar reseña de cada producto comprado (seguimiento post-venta).

## 6. Carrito y checkout

1. El carrito se arma en el navegador (persiste entre sesiones) y muestra subtotal.
2. En `/checkout`:
   - Se puede aplicar un **código promocional** — se valida antes de pagar y muestra el descuento reflejado en el total.
   - El **envío** se calcula automáticamente: **gratis a partir de $1,500 MXN** de subtotal; por debajo de ese monto, tarifa fija de **$99 MXN** (equivalente convertido si se paga en USD).
   - Se puede pagar como invitado (solo pidiendo correo) o como cliente autenticado.
   - El pago se procesa con Stripe, siempre en **modo de prueba** — un banner visible en el checkout lo aclara y da la tarjeta de prueba a usar (`4242 4242 4242 4242`), nunca se cobra dinero real.
3. Tras pagar, la página de confirmación muestra el recibo completo (ver §7) y limpia el carrito.

### Códigos promocionales activos actualmente

| Código | Descuento | Pedido mínimo |
|---|---|---|
| `BIENVENIDO10` | 10% | Ninguno |
| `PRIMERACOMPRA` | $100 MXN | $500 MXN |

Un administrador puede crear nuevos códigos desde `/admin/promociones` (código, tipo porcentaje/monto fijo, valor, pedido mínimo, límite de usos opcional).

## 7. Confirmación de pedido / factura

Cada pedido tiene un recibo/factura imprimible (mismo componente reutilizado en 3 lugares: confirmación de compra, detalle en `/cuenta/pedidos/[id]`, y detalle admin) que muestra:

- Número de pedido y fecha.
- Estado del pedido como una línea de progreso visual (Pendiente -> Pagado -> Enviado; Cancelado/Reembolsado se muestran aparte si aplica).
- Lista de artículos con cantidad y precio.
- Desglose: Subtotal, Descuento (si hubo código), Envío (o "Gratis"), Total.
- Dirección de envío capturada en el pago.
- Número de rastreo, una vez que el pedido se marca como enviado.
- Botón "Imprimir recibo".

## 8. Cuenta del cliente (`/cuenta`)

- Datos del perfil (nombre, correo).
- Acceso a "Mis pedidos" (`/cuenta/pedidos`): lista con número, fecha, artículos, estado y total; cada uno lleva al detalle/factura (§7).
- Favoritos (wishlist) guardados.
- Recuperación de contraseña (`/recuperar` -> correo con enlace -> `/restablecer`).

## 9. Panel de administración / vendedor (`/admin`)

Acceso restringido por rol; un vendedor ve el mismo panel pero **solo sus propios datos** (RLS lo garantiza a nivel de base de datos, no solo en la interfaz).

| Sección | Quién la ve | Qué hace |
|---|---|---|
| Resumen | Admin y vendedor | Contadores: productos, pedidos, alertas de stock bajo |
| Negocios | **Solo admin** | Lista, alta y edición de negocios; activar/pausar un negocio; asigna el dueño y lo promueve a vendedor |
| Mi negocio | **Solo vendedor** | Edita nombre, descripción, logo y banner de su propio negocio |
| Productos | Admin y vendedor (solo los suyos) | Alta, edición y borrado; campos dinámicos según categoría |
| Inventario | Admin y vendedor (solo lo suyo) | Ajuste de stock por variante; filas con stock bajo el umbral resaltadas |
| Pedidos | Admin (todos) / vendedor (con ítems suyos) | Lista de pedidos; **solo admin** puede cambiar el estado; el detalle de cada pedido incluye campo de **número de rastreo** editable |
| Analítica | Admin y vendedor | Ingresos de los últimos 30 días por día (gráfica), pedidos pagados, ticket promedio, top 5 productos más vendidos |
| Mensajes | **Solo admin** | Bandeja de mensajes de contacto (`/contacto`), con estado Nuevo/Leído |
| Promociones | **Solo admin** | Lista y creación de códigos de descuento |
| Usuarios | **Solo admin** | Lista de todos los usuarios con su correo y rol; puede cambiar el rol de cualquiera excepto el propio (evita que un admin se bloquee a sí mismo por accidente) |

## 10. Comunicación con el cliente

- **`/contacto`** — formulario (nombre, correo, asunto opcional, mensaje) que llega directo a la bandeja de admin.
- **`/ayuda`** — centro de ayuda con preguntas frecuentes (rastreo de pedido, métodos de pago, guía de tallas, cambio de moneda) y una sección de envíos y devoluciones.
- El pie de página enlaza a ayuda, envíos/devoluciones, contacto, términos de servicio y aviso de privacidad (documentos de ejemplo, marcados explícitamente como tales, para fines de demo).

## 11. Idiomas y monedas

- **Idiomas:** español (por defecto) e inglés, con prefijo de URL siempre visible (`/es/...`, `/en/...`) y selector en el header.
- **Monedas:** MXN (por defecto) y USD. El selector de moneda **recalcula tanto el precio mostrado como el monto real que Stripe cobra** — no es un cambio cosmético, usa una única tasa de cambio configurada por el admin como fuente de verdad.

## 12. Reglas de negocio (resumen)

- Envío gratis desde $1,500 MXN de subtotal; si no, $99 MXN fijos.
- Un código promocional se revalida siempre contra el pedido real al momento de pagar (nunca se confía en lo calculado en el navegador).
- El stock se descuenta automáticamente al completarse un pago, con registro de auditoría por movimiento.
- Alerta de "stock bajo" quedará marcada cuando la existencia de una variante caiga al umbral configurado para ese producto (5 unidades por defecto).
- Solo el comprador dueño de un pedido (o un admin, o el vendedor de alguno de sus ítems) puede verlo.
- Solo un administrador puede cambiar el estado de un pedido o el rol de un usuario.
- Un administrador no puede cambiar su propio rol desde la interfaz.
- Una reseña por cliente por producto.
- Un negocio por dueño; un vendedor solo edita su propio negocio; al pausar un negocio sus productos dejan de mostrarse.
- Un carrito con productos de varios negocios genera un único pedido.
- El checkout **nunca** procesa un cargo real — el cliente de Stripe está bloqueado a solo aceptar llaves de modo de prueba.

## 13. Fuera de alcance / pendiente (transparencia)

Cosas que la tienda **no** hace hoy, por decisión de alcance o por depender de algo externo al código:

- **Login con Google:** el botón existe pero es un stub — necesita credenciales OAuth reales que solo el dueño del proyecto puede generar en Google Cloud Console.
- **Libreta de direcciones reutilizable:** la tabla existe en la base de datos, pero el checkout todavía no la usa para guardar/reutilizar direcciones del cliente (usa solo una copia de la dirección de ese pedido puntual).
- **Notificaciones por correo de cambios de estado:** un cliente se entera de que su pedido se envió solo si entra a `/cuenta/pedidos`, no recibe un correo automático.
- **Moderación de reseñas** desde el panel admin.
- **Reseñas de compra verificada:** hoy cualquier usuario con sesión puede reseñar cualquier producto y la marca de verificación no se asigna.
- **Comparación de productos** (entre productos y entre vendedores).
- **Verificación de vendedores:** el alta es solo manual, por un administrador.
- **Devoluciones, reembolsos y disputas:** solo hay información en el centro de ayuda.
- **Reparto de pagos por vendedor (Stripe Connect):** un carrito es un pedido y el dinero no se divide.
- **El vendedor no cambia el estado ni el rastreo** de sus propios pedidos; lo hace el administrador.
- **Alta de variantes e imágenes desde la interfaz:** el formulario de producto no las gestiona todavía.
- **Pruebas automatizadas:** el proyecto no tiene un framework de tests configurado todavía.
