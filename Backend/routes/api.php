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

Route::post('/login', [AuthController::class, 'login']);
Route::get('/tipo-actividades', [TipoActividadController::class, 'index']);
Route::get('/tipo-asistentes', [App\Http\Controllers\TipoAsistenteController::class, 'index']);
Route::get('/consulta-dni/{dni}', [DataInternaController::class, 'consultaDni']);
Route::get('/eventos/{id}/banner-base64', [EventoController::class, 'getBannerBase64']);
Route::apiResource('eventos', EventoController::class)->only(['index', 'show']);
Route::post('/matriculas', [MatriculaController::class, 'store']);

Route::middleware('auth:sanctum')->group(function () {
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
    Route::get('/e-documentos/fondo-base64', [EDocumentoController::class, 'getFondoBase64']);
    Route::apiResource('e-documentos', EDocumentoController::class);
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
