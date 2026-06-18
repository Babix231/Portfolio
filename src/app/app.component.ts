import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Project {
  name: string;
  description: string;
  language: string;
  langColor: string;
  url: string;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('heroCanvas') heroCanvas!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private animationId!: number;
  private ripples: { x: number; y: number; radius: number; alpha: number }[] = [];
  private lastRippleTime = 0;
  private particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; pulse: number }[] = [];

  currentYear = new Date().getFullYear();

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit(): void {
    this.resizeCanvas();
    this.spawnParticles();
    this.ngZone.runOutsideAngular(() => this.animate());
  }

  private spawnParticles(): void {
    const canvas = this.heroCanvas.nativeElement;
    this.particles = Array.from({ length: 60 }, () => this.makeParticle(canvas.width, canvas.height));
  }

  private makeParticle(w: number, h: number) {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -Math.random() * 0.5 - 0.1,
      size: Math.random() * 1.8 + 0.4,
      alpha: Math.random() * 0.4 + 0.1,
      pulse: Math.random() * Math.PI * 2,
    };
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
  }

  @HostListener('window:resize')
  resizeCanvas(): void {
    const canvas = this.heroCanvas.nativeElement;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    this.ctx = canvas.getContext('2d')!;
    if (this.particles.length) this.spawnParticles();
  }

  onHeroMouseMove(event: MouseEvent): void {
    const canvas = this.heroCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const now = Date.now();
    if (now - this.lastRippleTime > 40) {
      this.ripples.push({ x, y, radius: 0, alpha: 0.55 });
      this.lastRippleTime = now;
    }
  }

  private animate(): void {
    const canvas = this.heroCanvas.nativeElement;
    const { width: w, height: h } = canvas;
    this.ctx.clearRect(0, 0, w, h);

    // particles
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += 0.02;
      const a = p.alpha * (0.7 + 0.3 * Math.sin(p.pulse));
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(88, 166, 255, ${a})`;
      this.ctx.fill();
      if (p.y < -10 || p.x < -10 || p.x > w + 10) {
        p.x = Math.random() * w;
        p.y = h + 10;
        p.vx = (Math.random() - 0.5) * 0.4;
        p.vy = -Math.random() * 0.5 - 0.1;
      }
    }

    // ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(88, 166, 255, ${r.alpha})`;
      this.ctx.lineWidth = 1.2;
      this.ctx.stroke();
      r.radius += 2.5;
      r.alpha -= 0.012;
      if (r.alpha <= 0) this.ripples.splice(i, 1);
    }

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  skills = [
    { name: 'C++', level: 85, color: '#f34b7d' },
    { name: 'C', level: 80, color: '#555555' },
    { name: 'Python', level: 70, color: '#3572A5' },
    { name: 'Linux', level: 75, color: '#ffa500' },
    { name: 'Git', level: 80, color: '#f05032' },
    { name: 'CMake', level: 65, color: '#064F8C' },
  ];

  projects: Project[] = [
    {
      name: 'Arcade-Epitech',
      description: 'Arcade avec bibliothèques dynamiques (ncurses, sfml, sdl, raylib) contenant 2 jeux : Snake et Pacman.',
      language: 'C++',
      langColor: '#f34b7d',
      url: 'https://github.com/Babix231/Arcade-Epitech',
    },
    {
      name: 'Raytracer-Epitech',
      description: 'Raytracer développé en 2ème année à Epitech, gérant les objets 3D, les lumières et bien plus.',
      language: 'C++',
      langColor: '#f34b7d',
      url: 'https://github.com/Babix231/Raytracer-Epitech',
    },
    {
      name: 'Zappy-Epitech',
      description: 'Jeu réseau multijoueur où plusieurs équipes s\'affrontent sur une carte à tuiles avec des ressources à collecter.',
      language: 'C',
      langColor: '#555555',
      url: 'https://github.com/Babix231/Zappy-Epitech',
    },
    {
      name: 'ML-TEK5',
      description: 'Projet de Machine Learning en 5ème année à Epitech, exploration des algorithmes d\'apprentissage automatique.',
      language: 'Python',
      langColor: '#3572A5',
      url: 'https://github.com/Babix231/ML-TEK5',
    },
  ];

  scrollTo(sectionId: string): void {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  }
}
