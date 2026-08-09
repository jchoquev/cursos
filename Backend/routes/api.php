<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TipoActividadController;
use App\Http\Controllers\EventoController;
use App\Http\Controllers\DataInternaController;

use App\Http\Controllers\UserController;
use App\Http\Controllers\MatriculaController;
use App\Http\Controllers\EDocumentoController;
use App\Http\Controllers\PeriodoAcaController;
use App\Http\Controllers\InvLineaController;
use App\Http\Controllers\ProyectoController;
use App\Http\Controllers\ValidarCertificadoController;
use App\Http\Controllers\DashboardController;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::get('/tipo-actividades', [TipoActividadController::class, 'index']);
Route::get('/tipo-asistentes', [App\Http\Controllers\TipoAsistenteController::class, 'index']);
Route::get('/consulta-dni/{dni}', [DataInternaController::class, 'consultaDni']);
Route::get('/eventos/{id}/banner-base64', [EventoController::class, 'getBannerBase64']);
Route::apiResource('eventos', EventoController::class)->only(['index', 'show']);
Route::post('/matriculas', [MatriculaController::class, 'store']);
Route::get('/periodo-aca', [PeriodoAcaController::class, 'index']);
Route::get('/periodo-aca/activo', [PeriodoAcaController::class, 'activo']);
Route::get('/validar-certificado/{codigo}', [ValidarCertificadoController::class, 'show']);
Route::get('/resolucion-pdf-base64', [EDocumentoController::class, 'getResolucionBase64']);
// El repositorio institucional es público; la gestión consulta /proyectos autenticado.
Route::get('/proyectos/publicos', [ProyectoController::class, 'publicIndex']);
Route::get('/proyectos/{id}/imagen-base64', [ProyectoController::class, 'publicImageBase64']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::apiResource('eventos', EventoController::class)->except(['index', 'show']);
    Route::apiResource('data-interna', DataInternaController::class)->parameters([
        'data-interna' => 'dni'
    ]);
    Route::post('/data-interna/import', [DataInternaController::class, 'import']);
    Route::apiResource('users', UserController::class)->parameters([
        'users' => 'email'
    ]);
    Route::apiResource('matriculas', MatriculaController::class)->except(['store']);
    Route::patch('/matriculas/{id}/validar-pago', [MatriculaController::class, 'validarPago']);
    Route::patch('/matriculas/{id}/emitir-certificado', [MatriculaController::class, 'emitirCertificado']);
    Route::post('/inscripciones/{id}/upload-pdf-escaneado', [MatriculaController::class, 'uploadPdfEscaneado']);
    Route::apiResource('periodo-aca', PeriodoAcaController::class)->except(['index'])->parameters(['periodo-aca' => 'id']);
    Route::apiResource('tipo-asistentes', App\Http\Controllers\TipoAsistenteController::class)->except(['index'])->parameters(['tipo-asistentes' => 'id']);
    Route::get('/e-documentos/fondo-base64', [EDocumentoController::class, 'getFondoBase64']);
    Route::apiResource('e-documentos', EDocumentoController::class);
    Route::apiResource('inv-lineas', InvLineaController::class);
    Route::apiResource('proyectos', ProyectoController::class);
    Route::patch('/proyectos/{id}/hidden', [ProyectoController::class, 'toggleHidden']);
    Route::post('/proyectos/{id}/upload-files', [ProyectoController::class, 'uploadFiles']);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get('/test', function () {
    return response()->json([
        'message' => 'API is working!',
        'time' => now()->toIso8601String()
    ]);
});
