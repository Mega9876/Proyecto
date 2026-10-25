using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using SneakZone.Api.Models;

namespace SneakZone.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<IdentityUser>(options)
{
    public DbSet<Marca> Marcas => Set<Marca>();
    public DbSet<Zapatilla> Zapatillas => Set<Zapatilla>();
    public DbSet<Inventario> Inventarios => Set<Inventario>();
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<Pedido> Pedidos => Set<Pedido>();
    public DbSet<DetallePedido> DetallesPedido => Set<DetallePedido>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Marca>(e =>
        {
            e.Property(x => x.Nombre).IsRequired().HasMaxLength(80);
            e.Property(x => x.Descripcion).HasMaxLength(300);
            e.HasIndex(x => x.Nombre).IsUnique();
        });

        modelBuilder.Entity<Zapatilla>(e =>
        {
            e.Property(x => x.Nombre).IsRequired().HasMaxLength(120);
            e.Property(x => x.Modelo).IsRequired().HasMaxLength(100);
            e.Property(x => x.Color).IsRequired().HasMaxLength(50);
            e.Property(x => x.Descripcion).HasMaxLength(500);
            e.Property(x => x.ImagenUrl).HasMaxLength(500);
            e.Property(x => x.Precio).HasPrecision(18, 2);
            e.HasOne(x => x.Marca).WithMany(x => x.Zapatillas)
                .HasForeignKey(x => x.MarcaId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Inventario>(e =>
        {
            e.HasIndex(x => new { x.ZapatillaId, x.Talla }).IsUnique();
            e.Property(x => x.Version).IsRowVersion();
            e.ToTable(t => t.HasCheckConstraint("CK_Inventarios_Stock", "\"Stock\" >= 0"));
            e.HasOne(x => x.Zapatilla).WithMany(x => x.Inventarios)
                .HasForeignKey(x => x.ZapatillaId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Cliente>(e =>
        {
            e.Property(x => x.Nombre).IsRequired().HasMaxLength(120);
            e.Property(x => x.Email).IsRequired().HasMaxLength(150);
            e.Property(x => x.Telefono).HasMaxLength(30);
            e.Property(x => x.Direccion).HasMaxLength(250);
            e.HasIndex(x => x.Email).IsUnique();
        });

        modelBuilder.Entity<Pedido>(e =>
        {
            e.Property(x => x.Estado).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Total).HasPrecision(18, 2);
            e.HasOne(x => x.Cliente).WithMany(x => x.Pedidos)
                .HasForeignKey(x => x.ClienteId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<DetallePedido>(e =>
        {
            e.Property(x => x.PrecioUnitario).HasPrecision(18, 2);
            e.Property(x => x.Subtotal).HasPrecision(18, 2);
            e.HasOne(x => x.Pedido).WithMany(x => x.Detalles)
                .HasForeignKey(x => x.PedidoId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Inventario).WithMany(x => x.DetallesPedido)
                .HasForeignKey(x => x.InventarioId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
