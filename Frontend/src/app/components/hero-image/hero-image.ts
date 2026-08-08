import { AfterViewInit, Component, ElementRef, OnDestroy, PLATFORM_ID, ViewChild, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';

interface HeroSlide {
  image: string;
  eyebrow: string;
  title: string;
  subtitle: string;
}

@Component({
  selector: 'app-hero-image',
  imports: [CommonModule],
  templateUrl: './hero-image.html',
  styleUrl: './hero-image.css',
})
export class HeroImage implements AfterViewInit, OnDestroy {
  @ViewChild('heroRoot', { static: true }) heroRoot!: ElementRef<HTMLElement>;

  readonly slides: HeroSlide[] = [
    {
      image: 'slider/hero-chojata.png',
      eyebrow: 'Formación que transforma',
      title: 'Aprende sin límites',
      subtitle: 'Explora cursos diseñados para llevarte al siguiente nivel',
    },
    {
      image: 'slider/hero-chojata-2.png',
      eyebrow: 'Tu próximo reto empieza aquí',
      title: 'Crece con propósito',
      subtitle: 'Desarrolla nuevas habilidades con expertos y experiencias reales',
    },
    {
      image: 'slider/hero-chojata-3.png',
      eyebrow: 'Conocimiento para avanzar',
      title: 'Inspírate y transforma',
      subtitle: 'Descubre oportunidades para convertir tus ideas en resultados',
    },
  ];

  readonly activeIndex = signal(0);
  private readonly platformId = inject(PLATFORM_ID);
  private autoplayId?: number;
  private transition?: gsap.core.Timeline;
  private particleCanvases: HTMLCanvasElement[] = [];
  private particleContexts: CanvasRenderingContext2D[] = [];
  private particleAnimationId?: number;
  private particleResizeHandler?: () => void;
  private particles: HeroParticle[] = [];

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const slideElements = this.getSlideElements();
    gsap.set(slideElements, { autoAlpha: 0 });
    gsap.set(slideElements[0], { autoAlpha: 1 });
    this.animateContent(slideElements[0], true);
    this.startParticles();
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
    this.transition?.kill();
    if (this.particleAnimationId !== undefined) cancelAnimationFrame(this.particleAnimationId);
    if (this.particleResizeHandler) window.removeEventListener('resize', this.particleResizeHandler);
  }

  nextSlide(): void {
    this.goTo((this.activeIndex() + 1) % this.slides.length);
  }

  previousSlide(): void {
    this.goTo((this.activeIndex() - 1 + this.slides.length) % this.slides.length);
  }

  goTo(index: number): void {
    if (!isPlatformBrowser(this.platformId) || index === this.activeIndex()) return;

    const slideElements = this.getSlideElements();
    const current = slideElements[this.activeIndex()];
    const next = slideElements[index];
    this.activeIndex.set(index);
    this.transition?.kill();

    this.transition = gsap.timeline({ defaults: { ease: 'power3.out' } });
    this.transition
      .set(next, { autoAlpha: 1, zIndex: 2 })
      .set(current, { zIndex: 1 })
      .to(current, { autoAlpha: 0, duration: 0.55 }, 0)
      .fromTo(next.querySelector('.hero-image'), { scale: 1.1 }, { scale: 1, duration: 1.2 }, 0)
      .fromTo(next.querySelector('.hero-eyebrow'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.45 }, 0.2)
      .fromTo(next.querySelector('.hero-title'), { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.28)
      .fromTo(next.querySelector('.hero-subtitle'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.42);

    this.startAutoplay();
  }

  pauseAutoplay(): void {
    this.stopAutoplay();
  }

  resumeAutoplay(): void {
    this.startAutoplay();
  }

  private animateContent(slide: HTMLElement, initial = false): void {
    gsap.set(slide.querySelector('.hero-image'), { scale: initial ? 1 : 1.1 });
    gsap.set(slide.querySelector('.hero-eyebrow'), { autoAlpha: 1, y: 0 });
    gsap.set(slide.querySelector('.hero-title'), { autoAlpha: 1, y: 0 });
    gsap.set(slide.querySelector('.hero-subtitle'), { autoAlpha: 1, y: 0 });
  }

  private getSlideElements(): HTMLElement[] {
    return Array.from(this.heroRoot.nativeElement.querySelectorAll<HTMLElement>('.hero-slide'));
  }

  private startAutoplay(): void {
    this.stopAutoplay();
    this.autoplayId = window.setInterval(() => this.nextSlide(), 6500);
  }

  private stopAutoplay(): void {
    if (this.autoplayId !== undefined) {
      window.clearInterval(this.autoplayId);
      this.autoplayId = undefined;
    }
  }

  private startParticles(): void {
    this.particleCanvases = Array.from(this.heroRoot.nativeElement.querySelectorAll<HTMLCanvasElement>('.hero-particles'));
    this.particleContexts = this.particleCanvases
      .map((canvas) => canvas.getContext('2d'))
      .filter((context): context is CanvasRenderingContext2D => context !== null);
    if (!this.particleCanvases.length || !this.particleContexts.length) return;

    this.resizeParticles();
    this.particleResizeHandler = () => this.resizeParticles();
    window.addEventListener('resize', this.particleResizeHandler);

    const draw = (time: number) => {
      this.drawParticles(time);
      this.particleAnimationId = requestAnimationFrame(draw);
    };
    this.particleAnimationId = requestAnimationFrame(draw);
  }

  private resizeParticles(): void {
    if (!this.particleCanvases.length) return;
    const bounds = this.heroRoot.nativeElement.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.particleCanvases.forEach((canvas) => {
      canvas.width = bounds.width * ratio;
      canvas.height = bounds.height * ratio;
    });
    this.particleContexts.forEach((context) => context.setTransform(ratio, 0, 0, ratio, 0, 0));
    this.particles = Array.from({ length: 56 }, () => this.createParticle(bounds.width, bounds.height, true));
  }

  private createParticle(width: number, height: number, randomPosition = false): HeroParticle {
    const colors = ['#f6d477', '#f43f5e', '#c084fc', '#67e8f9', '#ffffff'];
    return {
      x: Math.random() * width,
      y: randomPosition ? Math.random() * height : -10,
      size: 1.2 + Math.random() * 2.8,
      speed: 0.25 + Math.random() * 0.45,
      drift: (Math.random() - 0.5) * 0.18,
      phase: Math.random() * Math.PI * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      settled: false,
      settledAt: 0,
    };
  }

  private drawParticles(time: number): void {
    if (!this.particleCanvases.length || !this.particleContexts.length) return;

    const width = this.heroRoot.nativeElement.clientWidth;
    const height = this.heroRoot.nativeElement.clientHeight;

    for (const particle of this.particles) {
      if (!particle.settled) {
        particle.y += particle.speed;
        particle.x += particle.drift + Math.sin(time * 0.001 + particle.phase) * 0.08;
        if (particle.y >= height - particle.size) {
          particle.y = height - particle.size - Math.random() * 18;
          particle.settled = true;
          particle.settledAt = time;
        }
      } else if (time - particle.settledAt > 3500) {
        Object.assign(particle, this.createParticle(width, height));
        particle.y = -10;
      }
    }

    this.particleContexts.forEach((context) => {
      context.clearRect(0, 0, width, height);
      for (const particle of this.particles) {
        const settledAge = particle.settled ? time - particle.settledAt : 0;
        const fadeOut = settledAge > 2400 ? Math.max(0, 1 - (settledAge - 2400) / 1100) : 1;
        const pulse = particle.settled
          ? fadeOut
          : 0.35 + (Math.sin(time * 0.002 + particle.phase) + 1) * 0.25;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fillStyle = particle.color;
        context.globalAlpha = pulse * 0.72;
        context.shadowBlur = particle.size * 5;
        context.shadowColor = particle.color;
        context.fill();
      }
      context.globalAlpha = 1;
      context.shadowBlur = 0;
    });
  }
}

interface HeroParticle {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  phase: number;
  color: string;
  settled: boolean;
  settledAt: number;
}
