<?php

namespace App\Http\Controllers;

use App\Models\InvLinea;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class InvLineaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = InvLinea::with('periodoAca');

        if ($request->filled('periodo_id')) {
            $query->where('Id_PeriodoAca', $request->query('periodo_id'));
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where('Linea', 'like', "%{$search}%");
        }

        $perPage = (int) $request->query('per_page', 10);
        $paginated = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'data'         => $paginated->items(),
            'total'        => $paginated->total(),
            'per_page'     => $paginated->perPage(),
            'current_page' => $paginated->currentPage(),
            'last_page'    => $paginated->lastPage(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'Id_PeriodoAca' => 'required|exists:periodo_aca,Id',
            'Linea' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error de validación.',
                'errors' => $validator->errors()
            ], 422);
        }

        $linea = InvLinea::create($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Línea de investigación creada correctamente.',
            'data' => $linea
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $linea = InvLinea::with('periodoAca')->find($id);
        if (!$linea) {
            return response()->json([
                'status' => 'error',
                'message' => 'Línea de investigación no encontrada.'
            ], 404);
        }
        return response()->json($linea);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $linea = InvLinea::find($id);
        if (!$linea) {
            return response()->json([
                'status' => 'error',
                'message' => 'Línea de investigación no encontrada.'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'Id_PeriodoAca' => 'sometimes|required|exists:periodo_aca,Id',
            'Linea' => 'sometimes|required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error de validación.',
                'errors' => $validator->errors()
            ], 422);
        }

        $linea->update($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Línea de investigación actualizada correctamente.',
            'data' => $linea
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $linea = InvLinea::find($id);
        if (!$linea) {
            return response()->json([
                'status' => 'error',
                'message' => 'Línea de investigación no encontrada.'
            ], 404);
        }

        $linea->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Línea de investigación eliminada correctamente.'
        ]);
    }
}
