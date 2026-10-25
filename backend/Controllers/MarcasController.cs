using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using SneakZone.Api.Data;
using SneakZone.Api.Dtos;
using SneakZone.Api.Models;

namespace SneakZone.Api.Controllers;

[ApiController]
[Route("api/marcas")]
public class MarcasController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Listar(CancellationToken ct)
    {
        var marcas = await db.Marcas.AsNoTracking().OrderBy(m => m.Nombre)
            .Select(m => new MarcaRespuesta(m.Id, m.Nombre, m.Descripcion)).ToListAsync(ct);
        return Ok(marcas);
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> ObtenerPorId(int id, CancellationToken ct)
    {
        var m = await db.Marcas.AsNoTracking().Where(x => x.Id == id)
            .Select(x => new MarcaRespuesta(x.Id, x.Nombre, x.Descripcion)).FirstOrDefaultAsync(ct);
        return m is null ? NotFound(new { mensaje = "Marca no encontrada." }) : Ok(m);
    }

    [HttpPost]
    public async Task<IActionResult> Crear(GuardarMarcaDto dto, CancellationToken ct)
    {
        var nombre = dto.Nombre.Trim();
        if (string.IsNullOrWhiteSpace(nombre)) return BadRequest(new { mensaje = "El nombre es obligatorio." });
        if (await db.Marcas.AnyAsync(m => m.Nombre == nombre, ct))
            return Conflict(new { mensaje = "Ya existe una marca con ese nombre." });

        var marca = new Marca { Nombre = nombre, Descripcion = dto.Descripcion?.Trim() };
        db.Marcas.Add(marca);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(ObtenerPorId), new { id = marca.Id },
            new MarcaRespuesta(marca.Id, marca.Nombre, marca.Descripcion));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Actualizar(int id, GuardarMarcaDto dto, CancellationToken ct)
    {
        var marca = await db.Marcas.FindAsync(new object[] { id }, ct);
        if (marca is null) return NotFound(new { mensaje = "Marca no encontrada." });
        var nombre = dto.Nombre.Trim();
        if (string.IsNullOrWhiteSpace(nombre)) return BadRequest(new { mensaje = "El nombre es obligatorio." });
        if (await db.Marcas.AnyAsync(m => m.Id != id && m.Nombre == nombre, ct))
            return Conflict(new { mensaje = "Ya existe una marca con ese nombre." });

        marca.Nombre = nombre;
        marca.Descripcion = dto.Descripcion?.Trim();
        await db.SaveChangesAsync(ct);
        return Ok(new MarcaRespuesta(marca.Id, marca.Nombre, marca.Descripcion));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        var marca = await db.Marcas.FindAsync(new object[] { id }, ct);
        if (marca is null) return NotFound(new { mensaje = "Marca no encontrada." });
        if (await db.Zapatillas.AnyAsync(z => z.MarcaId == id, ct))
            return Conflict(new { mensaje = "No puedes eliminar una marca que tiene zapatillas." });
        db.Marcas.Remove(marca);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
