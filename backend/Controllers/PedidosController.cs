using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SneakZone.Api.Data;
using SneakZone.Api.Dtos;
using SneakZone.Api.Models;
using SneakZone.Api.Services;

namespace SneakZone.Api.Controllers;

[ApiController]
[Route("api/pedidos")]
public class PedidosController(AppDbContext db, PedidoService pedidos) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Listar(
        [FromQuery] int? clienteId, [FromQuery] EstadoPedido? estado, CancellationToken ct)
    {
        var consulta = ConsultaCompleta();
        if (clienteId.HasValue) consulta = consulta.Where(x => x.ClienteId == clienteId.Value);
        if (estado.HasValue) consulta = consulta.Where(x => x.Estado == estado.Value);
        var datos = await consulta.OrderByDescending(p => p.Fecha).ToListAsync(ct);
        return Ok(datos.Select(PedidoMapeo.Respuesta).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> ObtenerPorId(int id, CancellationToken ct)
    {
        var p = await ConsultaCompleta().FirstOrDefaultAsync(x => x.Id == id, ct);
        return p is null ? NotFound(new { mensaje = "Pedido no encontrado." }) : Ok(PedidoMapeo.Respuesta(p));
    }

    [HttpPost]
    public async Task<IActionResult> Crear(CrearPedidoDto dto, CancellationToken ct)
    {
        var resultado = await pedidos.CrearAsync(dto, ct);
        if (!resultado.Correcto)
            return StatusCode(resultado.CodigoHttp, new { mensaje = resultado.Mensaje });

        var pedido = await ConsultaCompleta().FirstAsync(x => x.Id == resultado.Id, ct);
        return CreatedAtAction(nameof(ObtenerPorId), new { id = pedido.Id }, PedidoMapeo.Respuesta(pedido));
    }

    [HttpPatch("{id:int}/cancelar")]
    public async Task<IActionResult> Cancelar(int id, CancellationToken ct)
    {
        var resultado = await pedidos.CancelarAsync(id, ct);
        if (!resultado.Correcto)
            return StatusCode(resultado.CodigoHttp, new { mensaje = resultado.Mensaje });
        return Ok(new { mensaje = resultado.Mensaje, pedidoId = resultado.Id });
    }

    private IQueryable<Pedido> ConsultaCompleta() => db.Pedidos.AsNoTracking()
        .Include(p => p.Cliente)
        .Include(p => p.Detalles).ThenInclude(d => d.Inventario).ThenInclude(i => i.Zapatilla)
        .AsSplitQuery();
}
