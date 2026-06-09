<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TipoActividadController;
use App\Http\Controllers\EventoController;
use App\Http\Controllers\DataInternaController;

Route::post('/login', [AuthController::class, 'login']);
Route::get('/tipo-actividades', [TipoActividadController::class, 'index']);
Route::get('/eventos/{id}/banner-base64', [EventoController::class, 'getBannerBase64']);

Route::apiResource('eventos', EventoController::class)->only(['index', 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('eventos', EventoController::class)->except(['index', 'show']);
    Route::apiResource('data-interna', DataInternaController::class)->parameters([
        'data-interna' => 'dni'
    ]);
    Route::post('/data-interna/import', [DataInternaController::class, 'import']);
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
