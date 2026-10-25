using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using SneakZone.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using SneakZone.Api.Data;
using SneakZone.Api.Dtos;
using SneakZone.Api.Models;

namespace SneakZone.Api.Controllers;

[ApiController]
[Route("api/zapatillas")]
public class ZapatillasController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Listar(
        [FromQuery] string? buscar, [FromQuery] int? marcaId,
        [FromQuery] decimal? precioMin, [FromQuery] decimal? precioMax,
        [FromQuery] bool incluirInactivas = false, CancellationToken ct = default)
    {
        if (incluirInactivas && !User.IsInRole(AdministradorInicial.Rol))
            return User.Identity?.IsAuthenticated == true ? Forbid() : Challenge();
        if (precioMin < 0 || precioMax < 0 || precioMin > precioMax)
            return BadRequest(new { mensaje = "El rango de precios no es válido." });

        var consulta = db.Zapatillas.AsNoTracking().Include(z => z.Marca)
            .Include(z => z.Inventarios).AsQueryable();
        if (!incluirInactivas) consulta = consulta.Where(z => z.Activa);
        if (marcaId.HasValue) consulta = consulta.Where(z => z.MarcaId == marcaId.Value);
        if (precioMin.HasValue) consulta = consulta.Where(z => z.Precio >= precioMin.Value);
        if (precioMax.HasValue) consulta = consulta.Where(z => z.Precio <= precioMax.Value);
        if (!string.IsNullOrWhiteSpace(buscar))
        {
            var termino = buscar.Trim();
            consulta = consulta.Where(z => z.Nombre.Contains(termino) ||
                z.Modelo.Contains(termino) || z.Marca.Nombre.Contains(termino));
        }

        var zapatillas = await consulta.OrderBy(z => z.Id).AsSplitQuery().ToListAsync(ct);
        return Ok(zapatillas.Select(ZapatillaMapeo.Respuesta).ToList());
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> ObtenerPorId(int id, CancellationToken ct)
    {
        var z = await db.Zapatillas.AsNoTracking().Include(x => x.Marca)
            .Include(x => x.Inventarios).AsSplitQuery().FirstOrDefaultAsync(x => x.Id == id, ct);
        return z is null || (!z.Activa && !User.IsInRole(AdministradorInicial.Rol)) ? NotFound(new { mensaje = "Zapatilla no encontrada." })
            : Ok(ZapatillaMapeo.Respuesta(z));
    }

    [HttpPost]
    public async Task<IActionResult> Crear(GuardarZapatillaDto dto, CancellationToken ct)
    {
        if (!await db.Marcas.AnyAsync(x => x.Id == dto.MarcaId, ct))
            return BadRequest(new { mensaje = "La marca indicada no existe." });
        if (string.IsNullOrWhiteSpace(dto.Nombre) || string.IsNullOrWhiteSpace(dto.Modelo) || string.IsNullOrWhiteSpace(dto.Color))
            return BadRequest(new { mensaje = "Completa nombre, modelo y color." });

        var z = new Zapatilla
        {
            Nombre = dto.Nombre.Trim(), Modelo = dto.Modelo.Trim(), Color = dto.Color.Trim(),
            Descripcion = dto.Descripcion?.Trim(), ImagenUrl = dto.ImagenUrl,
            Precio = dto.Precio, MarcaId = dto.MarcaId
        };
        db.Zapatillas.Add(z);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(ObtenerPorId), new { id = z.Id },
            new { mensaje = "Zapatilla creada. Ahora registra sus tallas en /api/inventario.", id = z.Id });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Actualizar(int id, GuardarZapatillaDto dto, CancellationToken ct)
    {
        var z = await db.Zapatillas.FindAsync(new object[] { id }, ct);
        if (z is null) return NotFound(new { mensaje = "Zapatilla no encontrada." });
        if (!await db.Marcas.AnyAsync(x => x.Id == dto.MarcaId, ct))
            return BadRequest(new { mensaje = "La marca indicada no existe." });
        if (string.IsNullOrWhiteSpace(dto.Nombre) || string.IsNullOrWhiteSpace(dto.Modelo) || string.IsNullOrWhiteSpace(dto.Color))
            return BadRequest(new { mensaje = "Completa nombre, modelo y color." });

        z.Nombre = dto.Nombre.Trim();
        z.Modelo = dto.Modelo.Trim();
        z.Color = dto.Color.Trim();
        z.Descripcion = dto.Descripcion?.Trim();
        z.ImagenUrl = dto.ImagenUrl;
        z.Precio = dto.Precio;
        z.MarcaId = dto.MarcaId;
        await db.SaveChangesAsync(ct);
        return Ok(new { mensaje = "Zapatilla actualizada.", id = z.Id });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Desactivar(int id, CancellationToken ct)
    {
        var z = await db.Zapatillas.FindAsync(new object[] { id }, ct);
        if (z is null) return NotFound(new { mensaje = "Zapatilla no encontrada." });
        z.Activa = false;
        await db.SaveChangesAsync(ct);
        return Ok(new { mensaje = "Zapatilla desactivada (borrado lógico)." });
    }

    [HttpPatch("{id:int}/activar")]
    public async Task<IActionResult> Activar(int id, CancellationToken ct)
    {
        var z = await db.Zapatillas.FindAsync(new object[] { id }, ct);
        if (z is null) return NotFound(new { mensaje = "Zapatilla no encontrada." });
        z.Activa = true;
        await db.SaveChangesAsync(ct);
        return Ok(new { mensaje = "Zapatilla activada." });
    }
}
