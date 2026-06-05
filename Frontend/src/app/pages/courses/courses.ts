import { Component } from '@angular/core';
import { HeroImage } from '../../components/hero-image/hero-image';

@Component({
  selector: 'app-courses',
  imports: [HeroImage],
  templateUrl: './courses.html',
  styleUrl: './courses.css',
})
export class Courses {}
