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
  private particles: Particle[] = [];
  private particleCanvas: HTMLCanvasElement | null = null;
  private particleContext: CanvasRenderingContext2D | null = null;
  private resizeHandler: (() => void) | null = null;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.startAnimation();
    }
  }

  ngOnDestroy(): void {
    if (this.animationId !== null) cancelAnimationFrame(this.animationId);
    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
  }

  private startAnimation(): void {
    const host = this.el.nativeElement as HTMLElement;
    const period = 1800;
    this.setupParticles(host);

    const tick = (time: number) => {
      this.setupParticles(host);
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
      this.drawParticles(time);
      this.animationId = requestAnimationFrame(tick);
    };

    this.animationId = requestAnimationFrame(tick);
  }

  private setupParticles(host: HTMLElement): void {
    if (this.particleCanvas) return;
    this.particleCanvas = host.querySelector('.anniversary-particles');
    if (!this.particleCanvas) return;
    this.particleContext = this.particleCanvas.getContext('2d');
    this.resizeParticles();
    this.resizeHandler = () => this.resizeParticles();
    window.addEventListener('resize', this.resizeHandler);
  }

  private resizeParticles(): void {
    if (!this.particleCanvas) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.particleCanvas.width = window.innerWidth * ratio;
    this.particleCanvas.height = window.innerHeight * ratio;
    this.particleContext?.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.particles = Array.from({ length: 85 }, () => this.createParticle(true));
  }

  private createParticle(randomY = false): Particle {
    const colors = ['#d9b45c', '#f3d58a', '#be123c', '#f43f5e', '#ffffff'];
    return {
      x: Math.random() * window.innerWidth,
      y: randomY ? Math.random() * window.innerHeight : -20,
      speed: 0.7 + Math.random() * 1.8,
      drift: (Math.random() - 0.5) * 0.8,
      size: 3 + Math.random() * 5,
      rotation: Math.random() * Math.PI,
      rotationSpeed: (Math.random() - 0.5) * 0.12,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.random() > 0.3 ? 'confetti' : 'spark',
      phase: Math.random() * Math.PI * 2,
    };
  }

  private drawParticles(time: number): void {
    const canvas = this.particleCanvas;
    const context = this.particleContext;
    if (!canvas || !context || !this.loader.anniversaryVisible()) return;

    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const particle of this.particles) {
      particle.y += particle.speed;
      particle.x += particle.drift + Math.sin(time * 0.001 + particle.phase) * 0.35;
      particle.rotation += particle.rotationSpeed;
      if (particle.y > window.innerHeight + 20) Object.assign(particle, this.createParticle());

      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.globalAlpha = 0.55 + Math.sin(time * 0.004 + particle.phase) * 0.35;
      context.fillStyle = particle.color;
      if (particle.shape === 'spark') {
        context.beginPath();
        context.arc(0, 0, particle.size * 0.55, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillRect(-particle.size / 2, -particle.size, particle.size, particle.size * 2.4);
      }
      context.restore();
    }
  }
}

interface Particle {
  x: number;
  y: number;
  speed: number;
  drift: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  shape: 'confetti' | 'spark';
  phase: number;
}
