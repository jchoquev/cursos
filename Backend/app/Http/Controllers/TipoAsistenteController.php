<?php

namespace App\Http\Controllers;

use App\Models\TipoAsistente;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Database\QueryException;

class TipoAsistenteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        return response()->json(TipoAsistente::orderBy('AsigTipo')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'AsigTipo' => 'required|string|max:100|unique:tipo_asistentes,AsigTipo',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'El nombre del tipo de asistente es obligatorio y debe ser único.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $tipo = TipoAsistente::create([
            'AsigTipo' => trim($request->input('AsigTipo')),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Tipo de asistente creado correctamente.',
            'data' => $tipo,
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $tipo = TipoAsistente::find($id);
        if (!$tipo) {
            return response()->json(['status' => 'error', 'message' => 'Tipo de asistente no encontrado.'], 404);
        }

        return response()->json($tipo);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $tipo = TipoAsistente::find($id);
        if (!$tipo) {
            return response()->json(['status' => 'error', 'message' => 'Tipo de asistente no encontrado.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'AsigTipo' => 'required|string|max:100|unique:tipo_asistentes,AsigTipo,' . $id . ',id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'El nombre del tipo de asistente es obligatorio y debe ser único.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $tipo->update(['AsigTipo' => trim($request->input('AsigTipo'))]);

        return response()->json([
            'status' => 'success',
            'message' => 'Tipo de asistente actualizado correctamente.',
            'data' => $tipo->fresh(),
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $tipo = TipoAsistente::find($id);
        if (!$tipo) {
            return response()->json(['status' => 'error', 'message' => 'Tipo de asistente no encontrado.'], 404);
        }

        try {
            $tipo->delete();
        } catch (QueryException $exception) {
            return response()->json([
                'status' => 'error',
                'message' => 'No se puede eliminar este tipo porque está siendo utilizado por matrículas o documentos.',
            ], 409);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Tipo de asistente eliminado correctamente.',
        ]);
    }
}
