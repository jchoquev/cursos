<?php

namespace App\Http\Controllers;

use App\Models\TipoActividad;
use Illuminate\Http\JsonResponse;

class TipoActividadController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        return response()->json(TipoActividad::all());
    }
}
