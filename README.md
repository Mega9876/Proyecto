# SneakZone

Tienda Angular y API ASP.NET Core 8 con PostgreSQL.

## Requisitos

- Node.js compatible con Angular 21 (por ejemplo, Node 24) y npm.
- SDK de .NET 8 o posterior con el runtime de ASP.NET Core 8 instalado.
- PostgreSQL iniciado. La conexión se configura en `backend/appsettings.json`, en `ConnectionStrings:SneakZone`. También puede sobrescribirse con la variable de entorno `ConnectionStrings__SneakZone` o con secretos de usuario de .NET.

Después de clonar, configura tu conexión local desde la raíz del proyecto, sustituyendo `TU_CONTRASEÑA` por la contraseña de tu PostgreSQL:

```powershell
dotnet user-secrets set "ConnectionStrings:SneakZone" "Host=localhost;Port=5432;Database=SneakZoneDb;Username=postgres;Password=TU_CONTRASEÑA" --project .\backend\SneakZone.Api.csproj
```

La conexión de `appsettings.json` se publica vacía. Las credenciales de la base de datos y del administrador se configuran localmente.

En desarrollo, la API aplica las migraciones existentes al arrancar y carga datos iniciales si todavía no hay marcas. No hace falta un `.sln` ni instalar `dotnet-ef` para iniciar la aplicación.

## Iniciar ambas aplicaciones

Abre una terminal de VS Code en `frontend`. La primera vez ejecuta `npm install` y después:

```powershell
npm run start:all
```

El comando inicia el backend, espera a que esté disponible y levanta Angular. `Ctrl+C` detiene ambos procesos. Los puertos 5168 y 4200 deben estar libres.

- Tienda: http://localhost:4200
- Catálogo y compras: http://localhost:4200/coleccion
- Administración: http://localhost:4200/administracion
- Documentación de la API: http://localhost:5168/swagger
- Estado de la API: http://localhost:5168/api/estado

## Acceso privado a administración

El panel no aparece en el menú ni en el pie de la tienda. El personal entra directamente en http://localhost:4200/administracion, que redirige al formulario `/administracion/acceso` cuando no hay una sesión autorizada. Tras iniciar sesión se vuelve a la sección solicitada. Puedes guardar esa dirección en favoritos.

Las cuentas se almacenan con ASP.NET Core Identity en PostgreSQL, separadas de los clientes de la tienda. Solo el rol `Administrador` puede gestionar productos, marcas, inventario y clientes, consultar estadísticas y pedidos, y cancelar ventas. El panel muestra el correo conectado y permite ver la tienda o cerrar sesión.

### Crear el administrador inicial o una cuenta adicional

Desde `Proyecto`, ejecuta:

```powershell
.\backend\configurar-administrador.ps1
```

El script solicita correo y contraseña y los guarda en los secretos locales de .NET, fuera del repositorio. Reinicia la API para crear la cuenta. La contraseña requiere al menos 12 caracteres, mayúscula, minúscula, número y símbolo. No hay registro público de administradores. Para otra cuenta, repite el proceso con otro correo; las cuentas anteriores se conservan. Si el correo ya existe, se le asigna el rol y se conserva su contraseña actual.

También se admite configuración `BootstrapAdmin:Email` y `BootstrapAdmin:Password` mediante un gestor de secretos o las variables de entorno `BootstrapAdmin__Email` y `BootstrapAdmin__Password`. Los secretos de usuario de .NET se cargan en desarrollo. Una vez creada la cuenta, esas opciones de aprovisionamiento pueden retirarse; el usuario y el hash de su contraseña permanecen en PostgreSQL.

### Sesión y protección de la API

- Cookie de sesión `HttpOnly`, `SameSite=Strict`, con una vigencia máxima de 8 horas, sin renovación deslizante. En producción exige HTTPS.
- Las operaciones que modifican datos exigen un token antifalsificación ligado a la sesión. Angular lo obtiene de `/api/auth/csrf` antes de cada escritura y lo envía como `X-XSRF-TOKEN`.
- Cinco contraseñas incorrectas bloquean la cuenta durante 15 minutos. El acceso también tiene un límite de 10 intentos por minuto por IP.
- La API devuelve `401` sin sesión o con sesión caducada, y `403` si falta el permiso requerido. Los guards de Angular redirigen al acceso; la autorización definitiva siempre la realiza el backend.
- El navegador no guarda contraseñas ni tokens de sesión en `localStorage`. Solo se conserva allí el carrito.

### Iniciar por separado

Desde `Proyecto`, en una terminal:

```powershell
dotnet run --project .\backend\SneakZone.Api.csproj --launch-profile http
```

En otra terminal, abierta en `frontend`:

```powershell
npm start
```

## Integración

El frontend usa rutas relativas `/api`. Durante `ng serve`, `frontend/proxy.conf.json` reenvía `/api/**` a `http://localhost:5168`. Si se cambia el puerto de la API, hay que actualizar el proxy y el iniciador `frontend/dev.mjs`.

El catálogo y los favoritos muestran datos de PostgreSQL. La administración permite crear/editar productos, marcas, clientes y tallas; ajustar stock; activar/desactivar productos; consultar y cancelar pedidos; y consultar estadísticas. Primero crea una marca, después un producto y finalmente sus tallas/stock para ponerlo a la venta.

El botón Añadir al carrito permite elegir talla y cantidad sin registrar todavía una venta. El contador de la bolsa, en la esquina superior derecha, muestra la suma de unidades añadidas. Al abrirla puedes modificar cantidades, eliminar artículos y ver el total. El carrito se conserva en el navegador al recargar la página; las tallas distintas se guardan por separado.

Desde Finalizar compra se comprueba el stock y se solicitan los datos del cliente una sola vez. Confirmar compra envía todos los artículos en un único pedido, reutilizando al cliente con el mismo correo o creando uno nuevo. El backend valida las existencias y descuenta stock; al cancelar desde administración lo devuelve. El carrito solo se vacía al confirmar correctamente el pedido. Este flujo registra ventas; no incluye procesamiento de pagos.

La compra pública usa `POST /api/checkout` con `{ cliente: { nombre, email, telefono, direccion }, items: [{ inventarioId, cantidad }] }`. La API resuelve el cliente internamente y solo devuelve el identificador, total y estado de esa compra. Los visitantes no pueden listar clientes ni consultar pedidos mediante su identificador. El catálogo público no permite consultar productos inactivos.

## Verificación

Desde `frontend`:

```powershell
npm run build
npm test -- --watch=false
```

Desde `backend`:

```powershell
dotnet build
dotnet test .\Tests\SneakZone.Api.Tests.csproj
```

Las pruebas de integración del backend usan PostgreSQL con bases temporales `sneakzone_auth_test_*`, creadas y eliminadas por cada prueba. La cuenta de conexión debe tener permiso para crear bases. Se usa la conexión configurada para la aplicación, cambiando únicamente el nombre de la base; también se puede proporcionar `SNEAKZONE_TEST_CONNECTION`. Verifican permisos, cookies, protección antifalsificación, bloqueo de acceso y compra/cancelación de varios artículos.

## Despliegue

El proxy pertenece al servidor de desarrollo. Para publicar, sirve los archivos de `frontend/dist/frontend/browser` y configura el servidor web para reenviar `/api` a la API y resolver las rutas Angular con `index.html`. En producción, aplica las migraciones antes de iniciar la API.
