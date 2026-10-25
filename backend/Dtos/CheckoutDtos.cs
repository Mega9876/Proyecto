using System.ComponentModel.DataAnnotations;

namespace SneakZone.Api.Dtos;

public class CheckoutDto
{
    [Required]
    public GuardarClienteDto Cliente { get; set; } = new();

    [Required, MinLength(1), MaxLength(100)]
    public List<ItemPedidoDto> Items { get; set; } = new();
}
