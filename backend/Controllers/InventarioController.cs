using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SneakZone.Api.Data;
using SneakZone.Api.Dtos;
using SneakZone.Api.Models;

namespace SneakZone.Api.Controllers;

[ApiController]
[Route("api/inventario")]
public class InventarioController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] int? zapatillaId, CancellationToken ct)
    {
        var consulta = db.Inventarios.AsNoTracking().Include(x => x.Zapatilla).AsQueryable();
        if (zapatillaId.HasValue) consulta = consulta.Where(x => x.ZapatillaId == zapatillaId.Value);
        var datos = await consulta.OrderBy(x => x.ZapatillaId).ThenBy(x => x.Talla)
            .Select(x => new InventarioRespuesta(x.Id, x.ZapatillaId, x.Zapatilla.Nombre, x.Talla, x.Stock, x.Version))
            .ToListAsync(ct);
        return Ok(datos);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> ObtenerPorId(int id, CancellationToken ct)
    {
        var dato = await db.Inventarios.AsNoTracking().Where(x => x.Id == id)
            .Select(x => new InventarioRespuesta(x.Id, x.ZapatillaId, x.Zapatilla.Nombre, x.Talla, x.Stock, x.Version))
            .FirstOrDefaultAsync(ct);
        return dato is null ? NotFound(new { mensaje = "Registro de inventario no encontrado." }) : Ok(dato);
    }

    [HttpPost]
    public async Task<IActionResult> Crear(CrearInventarioDto dto, CancellationToken ct)
    {
        if (!await db.Zapatillas.AnyAsync(x => x.Id == dto.ZapatillaId && x.Activa, ct))
            return BadRequest(new { mensaje = "La zapatilla no existe o está inactiva." });
        if (await db.Inventarios.AnyAsync(x => x.ZapatillaId == dto.ZapatillaId && x.Talla == dto.Talla, ct))
            return Conflict(new { mensaje = "Esa talla ya está registrada para la zapatilla." });

        var i = new Inventario { ZapatillaId = dto.ZapatillaId, Talla = dto.Talla, Stock = dto.Stock };
        db.Inventarios.Add(i);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(ObtenerPorId), new { id = i.Id },
            new { mensaje = "Talla registrada.", id = i.Id });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> AjustarStock(int id, ActualizarStockDto dto, CancellationToken ct)
    {
        var cantidad = await db.Inventarios.Where(i => i.Id == id && i.Version == dto.Version)
            .ExecuteUpdateAsync(set => set.SetProperty(i => i.Stock, dto.Stock), ct);
        if (cantidad == 0)
            return await db.Inventarios.AnyAsync(i => i.Id == id, ct)
                ? Conflict(new { mensaje = "El stock cambió. Consulta de nuevo el inventario y su versión antes de ajustar." })
                : NotFound(new { mensaje = "Registro no encontrado." });
        return Ok(new { mensaje = "Stock actualizado. Consulta el registro para obtener la nueva versión.", stock = dto.Stock });
    }

    [HttpPost("{id:int}/entrada")]
    public async Task<IActionResult> AgregarStock(int id, EntradaStockDto dto, CancellationToken ct)
    {
        var cantidad = await db.Inventarios.Where(i => i.Id == id && i.Stock <= int.MaxValue - dto.Cantidad)
            .ExecuteUpdateAsync(set => set.SetProperty(i => i.Stock, i => i.Stock + dto.Cantidad), ct);
        if (cantidad == 0) return BadRequest(new { mensaje = "Inventario no encontrado o suma demasiado grande." });
        return Ok(new { mensaje = "Entrada de stock registrada.", agregado = dto.Cantidad });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        var registro = await db.Inventarios.FindAsync(new object[] { id }, ct);
        if (registro is null) return NotFound(new { mensaje = "Registro no encontrado." });
        if (await db.DetallesPedido.AnyAsync(x => x.InventarioId == id, ct))
            return Conflict(new { mensaje = "Esa talla tiene ventas registradas y no se puede borrar." });
        db.Inventarios.Remove(registro);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
