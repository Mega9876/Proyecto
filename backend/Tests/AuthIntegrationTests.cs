using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using SneakZone.Api.Data;
using Xunit;

namespace SneakZone.Api.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    public const string Email = "admin@example.test";
    public const string Password = "Pruebas-SneakZone-2026!";
    private readonly string connection;

    public ApiFactory()
    {
        var root = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../.."));
        var config = new ConfigurationBuilder().AddJsonFile(Path.Combine(root, "appsettings.json"))
            .AddUserSecrets<Program>().AddEnvironmentVariables().Build();
        var builder = new NpgsqlConnectionStringBuilder(
            Environment.GetEnvironmentVariable("SNEAKZONE_TEST_CONNECTION") ?? config.GetConnectionString("SneakZone"))
        {
            Database = "sneakzone_auth_test_" + Guid.NewGuid().ToString("N"), Pooling = false
        };
        connection = builder.ConnectionString;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:SneakZone"] = connection,
            ["BootstrapAdmin:Email"] = Email,
            ["BootstrapAdmin:Password"] = Password,
            ["Logging:LogLevel:Default"] = "Warning"
        }));
    }

    public HttpClient Browser() => CreateClient(new WebApplicationFactoryClientOptions
    {
        AllowAutoRedirect = false, HandleCookies = true
    });

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(connection).Options);
        await db.Database.EnsureDeletedAsync();
    }
}

public class AuthIntegrationTests
{
    private static async Task<HttpResponseMessage> Post(HttpClient browser, string url, object body)
    {
        var csrf = await browser.GetFromJsonAsync<JsonElement>("/api/auth/csrf");
        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) };
        request.Headers.Add("X-XSRF-TOKEN", csrf.GetProperty("token").GetString());
        return await browser.SendAsync(request);
    }

    private static Task<HttpResponseMessage> Login(HttpClient browser, string password = ApiFactory.Password, string email = ApiFactory.Email)
        => Post(browser, "/api/auth/login", new { email, password });

    [Fact]
    public async Task VisitantesSoloAccedenAlCatalogoYNoPuedenModificarLaTienda()
    {
        await using var factory = new ApiFactory();
        using var browser = factory.Browser();
        Assert.Equal(HttpStatusCode.OK, (await browser.GetAsync("/api/zapatillas")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await browser.GetAsync("/api/marcas")).StatusCode);
        foreach (var url in new[] { "/api/clientes", "/api/inventario", "/api/pedidos", "/api/estadisticas", "/api/zapatillas?incluirInactivas=true", "/api/auth/me" })
            Assert.Equal(HttpStatusCode.Unauthorized, (await browser.GetAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Post(browser, "/api/marcas", new { nombre = "Intruso" })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Post(browser, "/api/pedidos", new { clienteId = 1, items = new[] { new { inventarioId = 1, cantidad = 1 } } })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await browser.PostAsJsonAsync("/api/auth/login", new { email = ApiFactory.Email, password = ApiFactory.Password })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await browser.PostAsJsonAsync("/api/checkout", new { })).StatusCode);
    }

    [Fact]
    public async Task SesionPermiteAdministrarYLogoutRetiraAcceso()
    {
        await using var factory = new ApiFactory();
        using var browser = factory.Browser();
        Assert.Equal(HttpStatusCode.Unauthorized, (await Login(browser, "ClaveIncorrecta!2026")).StatusCode);
        var login = await Login(browser);
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var cookie = login.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("SneakZone.Session="));
        Assert.Contains("httponly", cookie.ToLowerInvariant());
        Assert.Contains("samesite=strict", cookie.ToLowerInvariant());
        var me = await browser.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.Equal(ApiFactory.Email, me.GetProperty("email").GetString());
        Assert.Equal("Administrador", me.GetProperty("roles")[0].GetString());
        Assert.Equal(HttpStatusCode.OK, (await browser.GetAsync("/api/clientes")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await browser.GetAsync("/api/estadisticas")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await browser.PostAsJsonAsync("/api/marcas", new { nombre = "Sin token" })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await Post(browser, "/api/marcas", new { nombre = "Marca privada" })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Post(browser, "/api/auth/logout", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await browser.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await browser.GetAsync("/api/clientes")).StatusCode);
    }

    [Fact]
    public async Task NoSePermiteEntrarSinRolYSeBloqueanCincoIntentosFallidos()
    {
        await using var factory = new ApiFactory();
        using var browser = factory.Browser();
        using (var scope = factory.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
            Assert.True((await users.CreateAsync(new IdentityUser { UserName = "visitante@example.test", Email = "visitante@example.test" }, ApiFactory.Password)).Succeeded);
        }
        Assert.Equal(HttpStatusCode.Forbidden, (await Login(browser, email: "visitante@example.test")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await browser.GetAsync("/api/clientes")).StatusCode);
        for (var i = 0; i < 5; i++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await Login(browser, "Incorrecta!123456")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Login(browser)).StatusCode);
    }

    [Fact]
    public async Task CompraPublicaCreaUnPedidoConVariosProductosSinExponerClientes()
    {
        await using var factory = new ApiFactory();
        using var guest = factory.Browser();
        var response = await Post(guest, "/api/checkout", new
        {
            cliente = new { nombre = "Comprador prueba", email = "compra@example.test", telefono = "70000000", direccion = "Dirección prueba" },
            items = new[] { new { inventarioId = 1, cantidad = 2 }, new { inventarioId = 6, cantidad = 1 } }
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var order = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(2180m, order.GetProperty("total").GetDecimal());
        Assert.False(order.TryGetProperty("cliente", out _));
        Assert.False(order.TryGetProperty("clienteId", out _));
        Assert.Equal(HttpStatusCode.Unauthorized, (await guest.GetAsync("/api/pedidos/" + order.GetProperty("id").GetInt32())).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await guest.GetAsync("/api/clientes?buscar=compra@example.test")).StatusCode);
        using var admin = factory.Browser();
        Assert.Equal(HttpStatusCode.OK, (await Login(admin)).StatusCode);
        var stock = await admin.GetFromJsonAsync<JsonElement>("/api/inventario/1");
        Assert.Equal(3, stock.GetProperty("stock").GetInt32());
        Assert.Equal(HttpStatusCode.OK, (await Patch(admin, "/api/pedidos/" + order.GetProperty("id").GetInt32() + "/cancelar")).StatusCode);
        stock = await admin.GetFromJsonAsync<JsonElement>("/api/inventario/1");
        Assert.Equal(5, stock.GetProperty("stock").GetInt32());
    }

    [Fact]
    public async Task AdministradorGuardaProductoPumaConUrlDeImagenYSeConservaEnLaBase()
    {
        await using var factory = new ApiFactory();
        using var browser = factory.Browser();
        Assert.Equal(HttpStatusCode.OK, (await Login(browser)).StatusCode);
        var brands = await browser.GetFromJsonAsync<JsonElement>("/api/marcas");
        var pumaId = brands.EnumerateArray().Single(m => m.GetProperty("nombre").GetString() == "Puma")
            .GetProperty("id").GetInt32();
        const string image = "https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_2000,h_2000/global/388549/04/sv01/fnd/PHL/fmt/png/Slipstream-Sneakers";
        var response = await Post(browser, "/api/zapatillas", new
        {
            nombre = "Sleep stream", modelo = "Sleep stream", color = "Azul", precio = 750,
            marcaId = pumaId, imagenUrl = image, descripcion = "Zapatillas puma"
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        var product = await browser.GetFromJsonAsync<JsonElement>("/api/zapatillas/" + created.GetProperty("id").GetInt32());
        Assert.Equal("Sleep stream", product.GetProperty("nombre").GetString());
        Assert.Equal("Puma", product.GetProperty("marca").GetString());
        Assert.Equal(750m, product.GetProperty("precio").GetDecimal());
        Assert.Equal(image, product.GetProperty("imagenUrl").GetString());
    }

    private static async Task<HttpResponseMessage> Patch(HttpClient browser, string url)
    {
        var csrf = await browser.GetFromJsonAsync<JsonElement>("/api/auth/csrf");
        using var request = new HttpRequestMessage(HttpMethod.Patch, url) { Content = JsonContent.Create(new { }) };
        request.Headers.Add("X-XSRF-TOKEN", csrf.GetProperty("token").GetString());
        return await browser.SendAsync(request);
    }
}
