<?php

namespace App\Http\Controllers;

use App\Models\TipoAsistente;
use Illuminate\Http\JsonResponse;

class TipoAsistenteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        return response()->json(TipoAsistente::all());
    }
}
