using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SneakZone.Api.Data;
using SneakZone.Api.Dtos;
using SneakZone.Api.Models;

namespace SneakZone.Api.Controllers;

[ApiController]
[Route("api/estadisticas")]
public class EstadisticasController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Resumen(CancellationToken ct)
    {
        var zapatillas = await db.Zapatillas.CountAsync(z => z.Activa, ct);
        var clientes = await db.Clientes.CountAsync(ct);
        var confirmados = await db.Pedidos.CountAsync(p => p.Estado == EstadoPedido.Confirmado, ct);
        var cancelados = await db.Pedidos.CountAsync(p => p.Estado == EstadoPedido.Cancelado, ct);
        var total = await db.Pedidos.Where(p => p.Estado == EstadoPedido.Confirmado)
            .SumAsync(p => (decimal?)p.Total, ct) ?? 0m;
        var stockBajo = await db.Inventarios
            .CountAsync(i => i.Zapatilla.Activa && i.Stock <= 3, ct);

        var masVendidas = await db.DetallesPedido.AsNoTracking()
            .Where(d => d.Pedido.Estado == EstadoPedido.Confirmado)
            .GroupBy(d => new { d.Inventario.ZapatillaId, d.Inventario.Zapatilla.Nombre })
            .Select(g => new { g.Key.ZapatillaId, g.Key.Nombre, UnidadesVendidas = g.Sum(d => d.Cantidad) })
            .OrderByDescending(x => x.UnidadesVendidas)
            .Take(5).ToListAsync(ct);

        return Ok(new EstadisticasRespuesta(zapatillas, clientes,
            confirmados, cancelados, total, stockBajo, masVendidas.Select(x =>
                new MasVendidaRespuesta(x.ZapatillaId, x.Nombre, x.UnidadesVendidas)).ToList()));
    }
}
