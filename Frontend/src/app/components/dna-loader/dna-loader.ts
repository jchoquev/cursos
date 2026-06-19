import { Component, OnInit, OnDestroy, ElementRef, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { DnaLoaderService } from '../../services/dna-loader.service';

@Component({
  selector: 'app-dna-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dna-loader.html',
})
export class DnaLoaderComponent implements OnInit, OnDestroy {
  readonly loader = inject(DnaLoaderService);
  private el = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);
  private animationId: number | null = null;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.startAnimation();
    }
  }

  ngOnDestroy(): void {
    if (this.animationId !== null) cancelAnimationFrame(this.animationId);
  }

  private startAnimation(): void {
    const host = this.el.nativeElement as HTMLElement;
    const period = 1800;

    const tick = (time: number) => {
      const svg = host.querySelector('svg');
      if (svg) {
        const s1 = Array.from(svg.querySelectorAll<SVGCircleElement>('.dna-s1'));
        const s2 = Array.from(svg.querySelectorAll<SVGCircleElement>('.dna-s2'));
        const n = s1.length;
        const phase = (time / period) * Math.PI * 2;

        s1.forEach((c, i) => {
          const p = phase + (i / n) * Math.PI * 2;
          const s = Math.sin(p);
          c.setAttribute('cy', String(40 + 22 * s));
          c.setAttribute('r',  String(2.5 + 4.5 * (0.5 + 0.5 * s)));
          c.style.opacity = String(0.2 + 0.8 * (0.5 + 0.5 * s));
        });
        s2.forEach((c, i) => {
          const p = phase + (i / n) * Math.PI * 2 + Math.PI;
          const s = Math.sin(p);
          c.setAttribute('cy', String(40 + 22 * s));
          c.setAttribute('r',  String(2.5 + 4.5 * (0.5 + 0.5 * s)));
          c.style.opacity = String(0.2 + 0.8 * (0.5 + 0.5 * s));
        });
      }
      this.animationId = requestAnimationFrame(tick);
    };

    this.animationId = requestAnimationFrame(tick);
  }
}
