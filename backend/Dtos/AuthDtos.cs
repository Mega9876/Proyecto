using System.ComponentModel.DataAnnotations;

namespace SneakZone.Api.Dtos;

public class LoginDto
{
    [Required, EmailAddress, StringLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(256)]
    public string Password { get; set; } = string.Empty;
}

public record UsuarioSesion(string Email, IList<string> Roles);
