using System.ComponentModel.DataAnnotations;

namespace SneakZone.Api.Dtos;

public class GuardarMarcaDto
{
    [Required, StringLength(80, MinimumLength = 2)]
    public string Nombre { get; set; } = string.Empty;

    [StringLength(300)]
    public string? Descripcion { get; set; }
}

public record MarcaRespuesta(int Id, string Nombre, string? Descripcion);
