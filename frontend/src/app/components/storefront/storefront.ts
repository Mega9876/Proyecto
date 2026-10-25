import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { Cart } from '../cart/cart';

@Component({
  selector: 'app-storefront',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Cart],
  templateUrl: './storefront.html',
  styleUrl: './storefront.css'
})
export class Storefront {
  protected readonly cart = inject(CartService);
}
