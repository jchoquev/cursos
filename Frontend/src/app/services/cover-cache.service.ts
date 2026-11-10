import { Injectable } from '@angular/core';

/**
 * Guarda en el navegador las portadas en base64 para no descargarlas en cada
 * recarga. Si Cache Storage no está disponible, la app simplemente las pide
 * a la API como siempre.
 */
@Injectable({ providedIn: 'root' })
export class CoverCacheService {
  private readonly cacheName = 'pgic-covers-v1';

  private async open(): Promise<Cache | null> {
    if (typeof caches === 'undefined') return null;
    try {
      return await caches.open(this.cacheName);
    } catch {
      return null;
    }
  }

  private url(key: string): string {
    return `/__covers/${encodeURIComponent(key)}`;
  }

  async get(key: string): Promise<string | null> {
    try {
      const cache = await this.open();
      const response = await cache?.match(this.url(key));
      return response ? await response.text() : null;
    } catch {
      return null;
    }
  }

  async set(key: string, base64: string): Promise<void> {
    try {
      const cache = await this.open();
      await cache?.put(this.url(key), new Response(base64));
    } catch {
      // Sin espacio o sin permisos: la portada se volverá a pedir a la API.
    }
  }

  /** Elimina las portadas que ya no corresponden a ningún evento o proyecto. */
  async prune(validKeys: Set<string>): Promise<void> {
    try {
      const cache = await this.open();
      if (!cache) return;
      const validPaths = new Set([...validKeys].map((key) => this.url(key)));
      const stored = await cache.keys();
      await Promise.all(
        stored
          .filter((request) => !validPaths.has(new URL(request.url).pathname))
          .map((request) => cache.delete(request))
      );
    } catch {
      // La limpieza es opcional; un fallo aquí no afecta a la app.
    }
  }
}
