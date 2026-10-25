using System.ComponentModel.DataAnnotations;

namespace SneakZone.Api.Dtos;

public class GuardarClienteDto
{
    [Required, StringLength(120, MinimumLength = 2)]
    public string Nombre { get; set; } = string.Empty;

    [Required, EmailAddress, StringLength(150)]
    public string Email { get; set; } = string.Empty;

    [StringLength(30)]
    public string? Telefono { get; set; }

    [StringLength(250)]
    public string? Direccion { get; set; }
}

public record ClienteRespuesta(int Id, string Nombre, string Email, string? Telefono, string? Direccion);
