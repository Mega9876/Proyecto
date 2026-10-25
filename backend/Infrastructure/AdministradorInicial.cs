using Microsoft.AspNetCore.Identity;

namespace SneakZone.Api.Infrastructure;

public static class AdministradorInicial
{
    public const string Rol = "Administrador";

    public static async Task CrearAsync(IServiceProvider services, IConfiguration configuration)
    {
        var roles = services.GetRequiredService<RoleManager<IdentityRole>>();
        if (!await roles.RoleExistsAsync(Rol)) Validar(await roles.CreateAsync(new IdentityRole(Rol)));

        var email = configuration["BootstrapAdmin:Email"]?.Trim();
        var password = configuration["BootstrapAdmin:Password"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password)) return;

        var users = services.GetRequiredService<UserManager<IdentityUser>>();
        var user = await users.FindByEmailAsync(email);
        if (user is null)
        {
            user = new IdentityUser { UserName = email, Email = email, EmailConfirmed = true };
            Validar(await users.CreateAsync(user, password));
        }
        if (!await users.IsInRoleAsync(user, Rol)) Validar(await users.AddToRoleAsync(user, Rol));
    }

    private static void Validar(IdentityResult result)
    {
        if (!result.Succeeded)
            throw new InvalidOperationException("No se pudo crear el administrador: " +
                string.Join(" ", result.Errors.Select(error => error.Description)));
    }
}
