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
| **Vendedor** (`vendor`) | Dueño de un negocio; gestiona sus propios productos | Todo lo del cliente + panel: su negocio, sus productos, su inventario, pedidos donde tiene algún ítem vendido (marca como enviados solo sus artículos y registra el rastreo) |
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
- **Solo pueden reseñar quienes compraron el producto** (pedido pagado). La marca "compra verificada" la calcula la base de datos al publicar; ni el cliente ni el autor pueden falsificarla ni mover su reseña a otro producto.
- Un administrador puede **ocultar** una reseña (no se borra y se puede restaurar); las reseñas ocultas dejan de contar en promedios y calificaciones.
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
| Pedidos | Admin (todos) / vendedor (con ítems suyos) | Lista de pedidos; el **estado general** solo lo cambia el admin; cada **vendedor marca como enviados sus propios artículos** y registra su número de rastreo (el pedido pasa a enviado cuando ya no queda nada pendiente) |
| Analítica | Admin y vendedor | Ingresos de los últimos 30 días por día (gráfica), pedidos pagados, ticket promedio, top 5 productos más vendidos |
| Mensajes | **Solo admin** | Bandeja de mensajes de contacto (`/contacto`), con estado Nuevo/Leído |
| Promociones | **Solo admin** | Lista y creación de códigos de descuento |
| Usuarios | **Solo admin** | Lista de todos los usuarios con su correo y rol; puede cambiar el rol de cualquiera excepto el propio (evita que un admin se bloquee a sí mismo por accidente) |
| Solicitudes | **Solo admin** | Revisa las solicitudes de vendedor con un enlace temporal al documento de identidad; aprueba (crea el negocio y promueve al usuario) o rechaza con motivo |
| Devoluciones | Admin (todas) / vendedor (las de sus artículos) | Bandeja de devoluciones: el vendedor aprueba o rechaza; el admin resuelve disputas y ejecuta el reembolso por Stripe |
| Preguntas | Admin y vendedor (sobre sus productos) | Responde las preguntas públicas de los compradores; el admin puede ocultarlas |
| Reseñas | **Solo admin** | Moderación: oculta o restaura reseñas |
| Correos | **Solo admin** | Estado de la cola de notificaciones por correo y envío manual |
| Bitácora | **Solo admin** | Registro de los cambios hechos por administradores (solo qué campos cambiaron) |
| Solicitudes de datos | **Solo admin** | Solicitudes de eliminación de cuenta; se atienden a mano |

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

- Cada vendedor marca como enviados solo sus artículos; el pedido pasa a enviado cuando no queda nada pendiente.
- Solo quien compró un producto puede reseñarlo; la marca de compra verificada la fija la base de datos.
- Una devolución solo se pide por artículo enviado, dentro de los 30 días posteriores al envío, y una sola vez por artículo.
- El reembolso es el precio del artículo menos su parte proporcional del descuento aplicado; el envío no se reembolsa.
- El rechazo de un vendedor puede escalarse a Omnara; solo un administrador ejecuta el reembolso por Stripe.
- Un vendedor sin negocio no puede crear productos; un negocio con productos no se puede borrar.

## 13. Registro de vendedores (`/vender`)

- Cualquier cliente con sesión puede enviar una solicitud: nombre del negocio, descripción, teléfono y un **documento de identificación** (JPG, PNG, WebP o PDF, hasta 5 MB) que se guarda en un espacio privado que solo ven los administradores.
- Solo se permite una solicitud abierta por persona; si se rechaza (con motivo visible), puede volver a aplicar.
- Un administrador la aprueba con una dirección pública (slug) editable: en una sola operación se crea el negocio y la cuenta pasa a vendedor. El solicitante recibe un correo con la decisión.

## 14. Gestión del negocio y de los productos

- El vendedor sube el **logo y el banner** de su negocio y gestiona sus productos: imágenes (con portada) y **variantes** (SKU, talla, color, precio propio, inventario) desde la página del producto.
- Cada negocio muestra una **calificación**: el promedio de las reseñas visibles de sus productos.
- Las tarjetas indican "Vendido por"; las categorías se pueden **filtrar por vendedor** y la búsqueda encuentra también por nombre de negocio.

## 15. Comparación de productos

- Botón "Comparar" en tarjetas y fichas (hasta 4 productos) y una barra flotante. La página `/comparar` muestra lado a lado precio (resalta el mejor), vendedor, calificación, tallas y colores disponibles, existencias y características.
- En cada ficha, "Compara con otros negocios" propone productos de la misma categoría de otros vendedores. Como los productos no comparten un código común, **"similar" significa misma categoría y distinto vendedor**, no el mismo artículo exacto.

## 16. Devoluciones, reembolsos y disputas

1. El comprador pide la devolución de un artículo enviado desde el detalle de su pedido (motivo y comentario).
2. El vendedor la **aprueba o rechaza**. Si rechaza, el comprador puede **abrir una disputa** y Omnara decide.
3. Si se aprueba, el administrador ejecuta el **reembolso por Stripe** al método de pago original.
4. Comprador, vendedor y administrador conversan en un hilo hasta que el caso se resuelve. Los artículos de productos propios de Omnara pasan directo al administrador.
5. Cuando todos los artículos de un pedido se reembolsan, el pedido queda como reembolsado.
6. Con la devolución aprobada, el vendedor (o el administrador) puede **reponer el artículo al inventario**, una sola vez por devolución, si regresó en condiciones de venderse.

## 17. Preguntas y respuestas

- Cualquier usuario con sesión puede preguntarle al vendedor desde la ficha (hasta 5 preguntas por hora). Las preguntas y respuestas son públicas.
- Responde el vendedor del producto (o un administrador); un administrador puede ocultar una pregunta sin borrarla.

## 18. Direcciones guardadas, privacidad y notificaciones

- **Direcciones** (`/cuenta/direcciones`): hasta 10, una predeterminada, solo México o Estados Unidos. Al pagar, el comprador elige una guardada o captura otra en Stripe.
- **Privacidad** (`/cuenta/privacidad`): descarga de los datos propios en JSON y solicitud de eliminación de la cuenta, que atiende un administrador (los pedidos y pagos se conservan por obligaciones legales). Los términos y el aviso de privacidad están en `/terminos` y `/privacidad`, en español e inglés.
- **Correos**: confirmación de pedido, nueva venta (al vendedor), artículo enviado con rastreo, novedades de devoluciones, disputas (a administradores) y decisión de una solicitud de vendedor. Se envían solo cuando hay un proveedor de correo configurado.

## 19. Fuera de alcance / pendiente (transparencia)

- **Reparto de pagos por vendedor (Stripe Connect):** un carrito es un pedido y el dinero no se divide entre vendedores.
- **Paqueterías** y envío por vendedor o por peso.
- **Reposición automática de inventario** al aprobar una devolución: hoy es una acción manual del vendedor o del administrador (un artículo devuelto puede llegar dañado).
- **Comparar el mismo artículo exacto** entre vendedores (haría falta un código o modelo común).
- **Pruebas de extremo a extremo** en navegador; las reglas de la base se verificaron con scripts SQL fuera de la integración continua.
- **Texto legal revisado por un abogado:** los términos y el aviso son de un proyecto escolar.
