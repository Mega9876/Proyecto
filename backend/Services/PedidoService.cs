using System.Data;
using Microsoft.EntityFrameworkCore;
using SneakZone.Api.Data;
using SneakZone.Api.Dtos;
using SneakZone.Api.Models;

namespace SneakZone.Api.Services;

public record ResultadoOperacion(bool Correcto, int? Id, int CodigoHttp, string Mensaje)
{
    public static ResultadoOperacion Ok(int id, string mensaje) => new(true, id, 200, mensaje);
    public static ResultadoOperacion Error(int codigoHttp, string mensaje) => new(false, null, codigoHttp, mensaje);
}

public class PedidoService(AppDbContext db)
{
    public async Task<ResultadoOperacion> CrearAsync(CrearPedidoDto dto, CancellationToken ct)
    {
        if (dto.Items is null || dto.Items.Count == 0)
            return ResultadoOperacion.Error(400, "El pedido necesita al menos una zapatilla.");
        if (dto.Items.Select(x => x.InventarioId).Distinct().Count() != dto.Items.Count)
            return ResultadoOperacion.Error(400, "No repitas una misma talla: combina las cantidades en un solo elemento.");
        if (!await db.Clientes.AnyAsync(c => c.Id == dto.ClienteId, ct))
            return ResultadoOperacion.Error(400, "El cliente indicado no existe.");

        await using var transaccion = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var pedido = new Pedido { ClienteId = dto.ClienteId, Estado = EstadoPedido.Confirmado };

        foreach (var item in dto.Items.OrderBy(x => x.InventarioId))
        {
            if (item.Cantidad <= 0)
                return ResultadoOperacion.Error(400, "La cantidad debe ser mayor que cero.");

            var inventario = await db.Inventarios.AsNoTracking().Include(i => i.Zapatilla)
                .FirstOrDefaultAsync(i => i.Id == item.InventarioId, ct);
            if (inventario is null || !inventario.Zapatilla.Activa)
                return ResultadoOperacion.Error(400, $"La talla con inventario ID {item.InventarioId} no existe o está inactiva.");

            var filas = await db.Inventarios
                .Where(i => i.Id == item.InventarioId && i.Stock >= item.Cantidad)
                .ExecuteUpdateAsync(set => set.SetProperty(i => i.Stock, i => i.Stock - item.Cantidad), ct);
            if (filas == 0)
                return ResultadoOperacion.Error(409,
                    $"Stock insuficiente para {inventario.Zapatilla.Nombre}, talla {inventario.Talla}. Disponible al consultar: {inventario.Stock}.");

            var precio = inventario.Zapatilla.Precio;
            var subtotal = Math.Round(precio * item.Cantidad, 2);
            pedido.Detalles.Add(new DetallePedido
            {
                InventarioId = inventario.Id,
                Cantidad = item.Cantidad,
                PrecioUnitario = precio,
                Subtotal = subtotal
            });
            pedido.Total += subtotal;
        }

        db.Pedidos.Add(pedido);
        await db.SaveChangesAsync(ct);
        await transaccion.CommitAsync(ct);
        return ResultadoOperacion.Ok(pedido.Id, "Pedido registrado y stock descontado.");
    }

    public async Task<ResultadoOperacion> CancelarAsync(int id, CancellationToken ct)
    {
        await using var transaccion = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var actualizados = await db.Pedidos.Where(p => p.Id == id && p.Estado == EstadoPedido.Confirmado)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.Estado, EstadoPedido.Cancelado), ct);
        if (actualizados == 0)
        {
            if (!await db.Pedidos.AnyAsync(p => p.Id == id, ct))
                return ResultadoOperacion.Error(404, "Pedido no encontrado.");
            return ResultadoOperacion.Error(409, "Este pedido ya fue cancelado.");
        }

        var detalles = await db.DetallesPedido.AsNoTracking().Where(d => d.PedidoId == id)
            .OrderBy(d => d.InventarioId).ToListAsync(ct);
        foreach (var detalle in detalles)
        {
            await db.Inventarios.Where(i => i.Id == detalle.InventarioId)
                .ExecuteUpdateAsync(set => set.SetProperty(i => i.Stock, i => i.Stock + detalle.Cantidad), ct);
        }
        await transaccion.CommitAsync(ct);
        return ResultadoOperacion.Ok(id, "Pedido cancelado y stock restituido.");
    }
}
