import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HomeSections } from '../home-sections/home-sections';

@Component({
  selector: 'app-home',
  imports: [RouterLink, HomeSections],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {}
