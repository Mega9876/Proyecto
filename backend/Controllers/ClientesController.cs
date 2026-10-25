using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SneakZone.Api.Data;
using SneakZone.Api.Dtos;
using SneakZone.Api.Models;

namespace SneakZone.Api.Controllers;

[ApiController]
[Route("api/clientes")]
public class ClientesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] string? buscar, CancellationToken ct)
    {
        var consulta = db.Clientes.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(buscar))
        {
            var termino = buscar.Trim();
            consulta = consulta.Where(x => x.Nombre.Contains(termino) || x.Email.Contains(termino));
        }
        var datos = await consulta.OrderBy(x => x.Nombre)
            .Select(x => new ClienteRespuesta(x.Id, x.Nombre, x.Email, x.Telefono, x.Direccion))
            .ToListAsync(ct);
        return Ok(datos);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> ObtenerPorId(int id, CancellationToken ct)
    {
        var c = await db.Clientes.AsNoTracking().Where(x => x.Id == id)
            .Select(x => new ClienteRespuesta(x.Id, x.Nombre, x.Email, x.Telefono, x.Direccion))
            .FirstOrDefaultAsync(ct);
        return c is null ? NotFound(new { mensaje = "Cliente no encontrado." }) : Ok(c);
    }

    [HttpPost]
    public async Task<IActionResult> Crear(GuardarClienteDto dto, CancellationToken ct)
    {
        var email = dto.Email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(dto.Nombre) || string.IsNullOrWhiteSpace(email))
            return BadRequest(new { mensaje = "Nombre y correo son obligatorios." });
        if (await db.Clientes.AnyAsync(x => x.Email == email, ct))
            return Conflict(new { mensaje = "El correo ya está registrado." });
        var cliente = new Cliente
        {
            Nombre = dto.Nombre.Trim(), Email = email,
            Telefono = dto.Telefono?.Trim(), Direccion = dto.Direccion?.Trim()
        };
        db.Clientes.Add(cliente);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(ObtenerPorId), new { id = cliente.Id },
            new ClienteRespuesta(cliente.Id, cliente.Nombre, cliente.Email, cliente.Telefono, cliente.Direccion));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Actualizar(int id, GuardarClienteDto dto, CancellationToken ct)
    {
        var c = await db.Clientes.FindAsync(new object[] { id }, ct);
        if (c is null) return NotFound(new { mensaje = "Cliente no encontrado." });
        var email = dto.Email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(dto.Nombre) || string.IsNullOrWhiteSpace(email))
            return BadRequest(new { mensaje = "Nombre y correo son obligatorios." });
        if (await db.Clientes.AnyAsync(x => x.Id != id && x.Email == email, ct))
            return Conflict(new { mensaje = "El correo ya está registrado." });
        c.Nombre = dto.Nombre.Trim();
        c.Email = email;
        c.Telefono = dto.Telefono?.Trim();
        c.Direccion = dto.Direccion?.Trim();
        await db.SaveChangesAsync(ct);
        return Ok(new ClienteRespuesta(c.Id, c.Nombre, c.Email, c.Telefono, c.Direccion));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        var c = await db.Clientes.FindAsync(new object[] { id }, ct);
        if (c is null) return NotFound(new { mensaje = "Cliente no encontrado." });
        if (await db.Pedidos.AnyAsync(p => p.ClienteId == id, ct))
            return Conflict(new { mensaje = "El cliente tiene pedidos y no se puede eliminar." });
        db.Clientes.Remove(c);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
