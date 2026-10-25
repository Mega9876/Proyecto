using System.ComponentModel.DataAnnotations;

namespace SneakZone.Api.Dtos;

public class CrearInventarioDto
{
    [Range(1, int.MaxValue)]
    public int ZapatillaId { get; set; }

    [Range(20, 55)]
    public int Talla { get; set; }

    [Range(0, int.MaxValue)]
    public int Stock { get; set; }
}

public class ActualizarStockDto
{
    [Required]
    public uint? Version { get; set; }

    [Range(0, int.MaxValue)]
    public int Stock { get; set; }
}

public class EntradaStockDto
{
    [Range(1, 1000000)]
    public int Cantidad { get; set; }
}

public record InventarioRespuesta(
    int Id, int ZapatillaId, string Zapatilla,
    int Talla, int Stock, uint Version);
