import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

export interface LoginResponse {
  status: 'success' | 'error';
  user?: {
    name: string;
    email: string;
    role: string;
    dni: string;
  };
  token?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  /** URL base del backend Laravel */
  private readonly baseUrl = 'http://localhost:8000/api';

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------

  /** Construye las cabeceras con el Bearer token si existe */
  private getAuthHeaders(): HttpHeaders {
    let token = '';
    if (isPlatformBrowser(this.platformId)) {
      token = localStorage.getItem('auth_token') ?? '';
    }
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }

  // ----------------------------------------------------------------
  // Auth
  // ----------------------------------------------------------------

  /**
   * POST /api/login
   * Autentica al usuario contra el backend Laravel con Sanctum.
   */
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(
        `${this.baseUrl}/login`,
        { email, password },
        { headers: this.getAuthHeaders() }
      )
      .pipe(
        catchError((err) => {
          const message =
            err?.error?.message ?? 'Error al conectar con el servidor.';
          return throwError(() => new Error(message));
        })
      );
  }

  /**
   * POST /api/logout  (endpoint opcional — si no existe, solo limpia el token local)
   */
  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/logout`, {}, { headers: this.getAuthHeaders() })
      .pipe(catchError(() => throwError(() => new Error('Logout fallido.'))));
  }

  // ----------------------------------------------------------------
  // Recursos (listos para cuando el backend los exponga)
  // ----------------------------------------------------------------

  get<T>(path: string, params?: any): Observable<T> {
    return this.http
      .get<T>(`${this.baseUrl}${path}`, { 
        headers: this.getAuthHeaders(),
        params: params
      })
      .pipe(catchError((err) => throwError(() => err)));
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<T>(`${this.baseUrl}${path}`, body, { headers: this.getAuthHeaders() })
      .pipe(catchError((err) => throwError(() => err)));
  }

  /** POST con FormData (multipart/form-data) — para subir archivos */
  postFormData<T>(path: string, formData: FormData): Observable<T> {
    let token = '';
    if (isPlatformBrowser(this.platformId)) {
      token = localStorage.getItem('auth_token') ?? '';
    }
    const headers = new HttpHeaders({
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
    return this.http
      .post<T>(`${this.baseUrl}${path}`, formData, { headers })
      .pipe(catchError((err) => throwError(() => err)));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .put<T>(`${this.baseUrl}${path}`, body, { headers: this.getAuthHeaders() })
      .pipe(catchError((err) => throwError(() => err)));
  }

  delete<T>(path: string): Observable<T> {
    return this.http
      .delete<T>(`${this.baseUrl}${path}`, { headers: this.getAuthHeaders() })
      .pipe(catchError((err) => throwError(() => err)));
  }
}
