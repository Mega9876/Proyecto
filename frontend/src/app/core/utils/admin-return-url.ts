export function adminReturnUrl(value: string | null): string {
  const paths = ['', '/productos', '/marcas', '/inventario', '/clientes', '/pedidos'].map(p => '/administracion' + p);
  return value && paths.includes(value) ? value : '/administracion';
}
