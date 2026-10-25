# Frontend SneakZone

Aplicación Angular conectada con la API de `../backend` mediante `/api`.

```powershell
npm install
npm run start:all
```

Abre http://localhost:4200. PostgreSQL debe estar iniciado y la conexión del backend configurada. `Ctrl+C` detiene las dos aplicaciones.

Para iniciar solo Angular: `npm start` (requiere la API en http://localhost:5168).

Consulta [la documentación del proyecto](../README.md) para los requisitos, la administración, las comprobaciones y el despliegue.

## Organización del código

```text
src/app/
├── components/
│   ├── admin-layout/
│   ├── admin-login/
│   ├── admin-page/
│   ├── cart/
│   ├── collection/
│   ├── home/
│   ├── home-sections/
│   └── storefront/
├── core/
│   ├── config/api.config.ts
│   ├── guards/auth.guard.ts
│   ├── interceptors/auth.interceptor.ts
│   └── utils/
│       ├── admin-return-url.ts
│       └── api-error.ts
├── models/
│   ├── cart-item.model.ts
│   ├── cliente.model.ts
│   ├── estadisticas.model.ts
│   ├── inventario.model.ts
│   ├── marca.model.ts
│   ├── pedido.model.ts
│   ├── producto.model.ts
│   └── session-user.model.ts
├── services/
│   ├── api.service.ts
│   ├── auth.service.ts
│   └── cart.service.ts
├── app.config.ts
├── app.routes.ts
├── app.spec.ts
└── app.ts
```

- **`components/`**: cada componente agrupa su TypeScript, HTML y CSS.
- **`core/`**: configuración compartida, protección de rutas, interceptor de sesión/antifalsificación y utilidades.
- **`models/`**: interfaces de productos y tallas, marcas, inventario, clientes, pedidos, estadísticas, sesión y carrito.
- **`services/`**: comunicación con la API, gestión de sesión y estado persistente del carrito.
- Las pruebas de servicios e interceptor se encuentran junto al archivo correspondiente. `app.spec.ts` verifica la navegación y los flujos integrados de la aplicación.

La ruta base de la API se define en `src/app/core/config/api.config.ts`. Su valor `/api` utiliza el proxy de desarrollo de `proxy.conf.json`.

## Comprobaciones

```powershell
npm run build
npm test -- --watch=false
```
