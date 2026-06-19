<?php

namespace App\Http\Controllers;

use App\Models\Proyecto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProyectoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Proyecto::with('linea');

        if ($request->filled('linea_id')) {
            $query->where('Id_Linea', $request->query('linea_id'));
        }

        if ($request->filled('estado')) {
            $query->where('Estado', $request->query('estado'));
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('Titulo', 'like', "%{$search}%")
                  ->orWhere('Resumen', 'like', "%{$search}%")
                  ->orWhere('Estado', 'like', "%{$search}%");
            });
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
            'Titulo' => 'required|string',
            'Resumen' => 'required|string',
            'Responsable' => 'required|array',
            'Asesor' => 'required|array',
            'Id_Linea' => 'required|exists:inv_lineas,Id',
            'Inicio' => 'required|date',
            'Fin' => 'nullable|date',
            'Estado' => 'required|string',
            'Ganador' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error de validación.',
                'errors' => $validator->errors()
            ], 422);
        }

        $proyecto = Proyecto::create($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Proyecto creado correctamente.',
            'data' => $proyecto
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $proyecto = Proyecto::with('linea')->find($id);
        if (!$proyecto) {
            return response()->json([
                'status' => 'error',
                'message' => 'Proyecto no encontrado.'
            ], 404);
        }
        return response()->json($proyecto);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $proyecto = Proyecto::find($id);
        if (!$proyecto) {
            return response()->json([
                'status' => 'error',
                'message' => 'Proyecto no encontrado.'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'Titulo' => 'sometimes|required|string',
            'Resumen' => 'sometimes|required|string',
            'Responsable' => 'sometimes|required|array',
            'Asesor' => 'sometimes|required|array',
            'Id_Linea' => 'sometimes|required|exists:inv_lineas,Id',
            'Inicio' => 'sometimes|required|date',
            'Fin' => 'nullable|date',
            'Estado' => 'sometimes|required|string',
            'Ganador' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error de validación.',
                'errors' => $validator->errors()
            ], 422);
        }

        $proyecto->update($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Proyecto actualizado correctamente.',
            'data' => $proyecto
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $proyecto = Proyecto::find($id);
        if (!$proyecto) {
            return response()->json([
                'status' => 'error',
                'message' => 'Proyecto no encontrado.'
            ], 404);
        }

        $proyecto->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Proyecto eliminado correctamente.'
        ]);
    }
}
