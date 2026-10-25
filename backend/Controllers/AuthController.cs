using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SneakZone.Api.Dtos;
using SneakZone.Api.Infrastructure;

namespace SneakZone.Api.Controllers;

[ApiController]
[Route("api/auth")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class AuthController(UserManager<IdentityUser> users, SignInManager<IdentityUser> signIn) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("csrf")]
    public IActionResult Csrf([FromServices] IAntiforgery antiforgery)
    {
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);
        return Ok(new { token = tokens.RequestToken });
    }

    [AllowAnonymous]
    [HttpPost("login")]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var user = await users.FindByEmailAsync(dto.Email.Trim());
        if (user is null)
        {
            _ = users.PasswordHasher.HashPassword(new IdentityUser(), dto.Password);
            return Unauthorized(new { mensaje = "Correo o contraseña incorrectos, o acceso temporalmente bloqueado." });
        }
        var result = await signIn.CheckPasswordSignInAsync(user, dto.Password, lockoutOnFailure: true);
        if (!result.Succeeded)
            return Unauthorized(new { mensaje = "Correo o contraseña incorrectos, o acceso temporalmente bloqueado." });
        if (!await users.IsInRoleAsync(user, AdministradorInicial.Rol))
            return StatusCode(403, new { mensaje = "Esta cuenta no tiene permisos de administración." });

        await signIn.SignInAsync(user, isPersistent: false);
        return Ok(new UsuarioSesion(user.Email!, await users.GetRolesAsync(user)));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await users.GetUserAsync(User);
        return user is null ? Unauthorized() : Ok(new UsuarioSesion(user.Email!, await users.GetRolesAsync(user)));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await signIn.SignOutAsync();
        return NoContent();
    }
}
