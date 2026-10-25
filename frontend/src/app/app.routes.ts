import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Collection } from './components/collection/collection';
import { Storefront } from './components/storefront/storefront';
import { AdminLayout } from './components/admin-layout/admin-layout';
import { AdminPage } from './components/admin-page/admin-page';
import { AdminLogin } from './components/admin-login/admin-login';
import { adminGuard, loginGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'administracion/acceso', component: AdminLogin, canActivate: [loginGuard], title: 'Acceso privado — SneakZone' },
  {
    path: 'administracion', component: AdminLayout,
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    children: [
      { path: '', component: AdminPage, data: { section: 'resumen' }, title: 'Vista general — Sneakzone' },
      { path: 'productos', component: AdminPage, data: { section: 'productos' }, title: 'Productos — Administración' },
      { path: 'marcas', component: AdminPage, data: { section: 'marcas' }, title: 'Marcas — Administración' },
      { path: 'inventario', component: AdminPage, data: { section: 'inventario' }, title: 'Inventario — Administración' },
      { path: 'clientes', component: AdminPage, data: { section: 'clientes' }, title: 'Clientes — Administración' },
      { path: 'pedidos', component: AdminPage, data: { section: 'pedidos' }, title: 'Pedidos — Administración' }
    ]
  },
  {
    path: '', component: Storefront,
    children: [
      { path: '', component: Home, title: 'Sneakzone — Move your world' },
      { path: 'coleccion', component: Collection, title: 'Colección — Sneakzone' }
    ]
  },
  { path: '**', redirectTo: '' }
];
