using Microsoft.EntityFrameworkCore;
using SneakZone.Api.Models;

namespace SneakZone.Api.Data;

public static class DatosIniciales
{
    public static async Task CargarAsync(AppDbContext db)
    {
        if (await db.Marcas.AnyAsync()) return;

        var nike = new Marca { Nombre = "Nike", Descripcion = "Zapatillas deportivas y urbanas" };
        var adidas = new Marca { Nombre = "Adidas", Descripcion = "Moda y deporte" };
        var puma = new Marca { Nombre = "Puma", Descripcion = "Calzado deportivo" };
        var newBalance = new Marca { Nombre = "New Balance", Descripcion = "Calzado deportivo y urbano" };

        var productos = new List<Zapatilla>
        {
            new()
            {
                Nombre = "Nike Air Force 1", Modelo = "Air Force 1 Low", Color = "Blanco",
                Precio = 750m, Marca = nike,
                ImagenUrl = "https://images.footlocker.com/is/image/EBFL2/W2288111?wid=1000&hei=1000&fmt=png-alpha",
                Descripcion = "Zapatilla urbana blanca",
                Inventarios = new() { new() { Talla = 38, Stock = 5 }, new() { Talla = 39, Stock = 8 }, new() { Talla = 40, Stock = 4 } }
            },
            new()
            {
                Nombre = "Nike Air Max 90", Modelo = "Air Max 90", Color = "Negro",
                Precio = 920m, Marca = nike,
                ImagenUrl = "https://images.footlocker.com/is/image/EBFL2/N8490003?wid=1000&hei=1000&fmt=png-alpha",
                Inventarios = new() { new() { Talla = 39, Stock = 6 }, new() { Talla = 40, Stock = 3 } }
            },
            new()
            {
                Nombre = "Adidas Samba", Modelo = "Samba OG", Color = "Blanco y negro",
                Precio = 680m, Marca = adidas,
                ImagenUrl = "https://images.footlocker.com/is/image/EBFL2/B75806?wid=1000&hei=1000&fmt=png-alpha",
                Inventarios = new() { new() { Talla = 37, Stock = 4 }, new() { Talla = 38, Stock = 9 } }
            },
            new()
            {
                Nombre = "Puma Suede Classic", Modelo = "Suede", Color = "Azul",
                Precio = 590m, Marca = puma, Activa = false,
                ImagenUrl = "https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_1000,h_1000/global/374915/04/sv01/fnd/PNA/fmt/png/Suede-Classic-XXI-Sneakers",
                Inventarios = new() { new() { Talla = 38, Stock = 7 }, new() { Talla = 41, Stock = 2 } }
            },
            new()
            {
                Nombre = "Nike Dunk Low", Modelo = "Dunk Low Retro", Color = "Blanco y negro",
                Precio = 890m, Marca = nike,
                Descripcion = "Silueta urbana de perfil bajo en blanco y negro.",
                ImagenUrl = "https://images.footlocker.com/is/image/EBFL2/D1391100?wid=1000&hei=1000&fmt=png-alpha",
                Inventarios = new() { new() { Talla = 38, Stock = 5 }, new() { Talla = 39, Stock = 6 }, new() { Talla = 40, Stock = 4 } }
            },
            new()
            {
                Nombre = "Nike Air Max 97", Modelo = "Air Max 97", Color = "Negro y blanco",
                Precio = 1050m, Marca = nike,
                Descripcion = "Diseño de líneas onduladas con amortiguación Air de longitud completa.",
                ImagenUrl = "https://images.footlocker.com/is/image/EBFL2/21826001?wid=1000&hei=1000&fmt=png-alpha",
                Inventarios = new() { new() { Talla = 39, Stock = 4 }, new() { Talla = 40, Stock = 5 }, new() { Talla = 41, Stock = 3 } }
            },
            new()
            {
                Nombre = "Adidas Gazelle", Modelo = "Gazelle", Color = "Azul y blanco",
                Precio = 650m, Marca = adidas,
                Descripcion = "Zapatilla clásica de ante azul marino con tres bandas blancas.",
                ImagenUrl = "https://images.footlocker.com/is/image/EBFL2/BB5478?wid=1000&hei=1000&fmt=png-alpha",
                Inventarios = new() { new() { Talla = 37, Stock = 4 }, new() { Talla = 38, Stock = 6 }, new() { Talla = 39, Stock = 3 } }
            },
            new()
            {
                Nombre = "Adidas Campus 00s", Modelo = "Campus 00s", Color = "Negro y blanco",
                Precio = 720m, Marca = adidas,
                Descripcion = "Estilo urbano de ante negro, bandas blancas y suela color caramelo.",
                ImagenUrl = "https://images.footlocker.com/is/image/EBFL2/HQ8708?wid=1000&hei=1000&fmt=png-alpha",
                Inventarios = new() { new() { Talla = 38, Stock = 5 }, new() { Talla = 39, Stock = 5 }, new() { Talla = 40, Stock = 4 } }
            },
            new()
            {
                Nombre = "New Balance 550", Modelo = "550", Color = "Blanco y verde",
                Precio = 850m, Marca = newBalance,
                Descripcion = "Silueta retro de baloncesto en blanco con detalles verdes.",
                ImagenUrl = "https://images.footlocker.com/is/image/EBFL2/BB550WT1?wid=1000&hei=1000&fmt=png-alpha",
                Inventarios = new() { new() { Talla = 39, Stock = 4 }, new() { Talla = 40, Stock = 6 }, new() { Talla = 41, Stock = 3 } }
            }
        };

        await db.Zapatillas.AddRangeAsync(productos);
        await db.Clientes.AddAsync(new Cliente
        {
            Nombre = "Cliente de prueba", Email = "cliente@ejemplo.com", Telefono = "70000000"
        });
        await db.SaveChangesAsync();
    }
}
