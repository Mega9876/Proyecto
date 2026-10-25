using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SneakZone.Api.Data;
using SneakZone.Api.Dtos;
using SneakZone.Api.Models;
using SneakZone.Api.Services;

namespace SneakZone.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/checkout")]
public class CheckoutController(AppDbContext db, PedidoService pedidos) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Comprar(CheckoutDto dto, CancellationToken ct)
    {
        var email = dto.Cliente.Email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(dto.Cliente.Nombre) || string.IsNullOrWhiteSpace(email))
            return BadRequest(new { mensaje = "Nombre y correo son obligatorios." });

        var cliente = await db.Clientes.FirstOrDefaultAsync(c => c.Email == email, ct);
        if (cliente is null)
        {
            cliente = new Cliente
            {
                Nombre = dto.Cliente.Nombre.Trim(), Email = email,
                Telefono = dto.Cliente.Telefono?.Trim(), Direccion = dto.Cliente.Direccion?.Trim()
            };
            db.Clientes.Add(cliente);
            await db.SaveChangesAsync(ct);
        }

        var resultado = await pedidos.CrearAsync(new CrearPedidoDto { ClienteId = cliente.Id, Items = dto.Items }, ct);
        if (!resultado.Correcto) return StatusCode(resultado.CodigoHttp, new { mensaje = resultado.Mensaje });
        var pedido = await db.Pedidos.AsNoTracking().FirstAsync(p => p.Id == resultado.Id, ct);
        return StatusCode(201, new { id = pedido.Id, total = pedido.Total, estado = pedido.Estado });
    }
}
