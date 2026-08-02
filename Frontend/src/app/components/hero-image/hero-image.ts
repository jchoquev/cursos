import { AfterViewInit, Component, ElementRef, OnDestroy, PLATFORM_ID, ViewChild, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';

interface HeroSlide {
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
      eyebrow: 'Formación que transforma',
      title: 'Aprende sin límites',
      subtitle: 'Explora cursos diseñados para llevarte al siguiente nivel',
    },
    {
      eyebrow: 'Tu próximo reto empieza aquí',
      title: 'Crece con propósito',
      subtitle: 'Desarrolla nuevas habilidades con expertos y experiencias reales',
    },
    {
      eyebrow: 'Conocimiento para avanzar',
      title: 'Inspírate y transforma',
      subtitle: 'Descubre oportunidades para convertir tus ideas en resultados',
    },
  ];

  readonly activeIndex = signal(0);
  private readonly platformId = inject(PLATFORM_ID);
  private autoplayId?: number;
  private transition?: gsap.core.Timeline;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const slideElements = this.getSlideElements();
    gsap.set(slideElements, { autoAlpha: 0 });
    gsap.set(slideElements[0], { autoAlpha: 1 });
    this.animateContent(slideElements[0], true);
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
    this.transition?.kill();
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
}
