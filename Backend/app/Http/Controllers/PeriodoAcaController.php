<?php

namespace App\Http\Controllers;

use App\Models\PeriodoAca;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PeriodoAcaController extends Controller
{
    public function index(): JsonResponse
    {
        $periodos = PeriodoAca::orderByDesc('Asig')->get();
        return response()->json($periodos);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'Asig'   => 'required|string|max:20|unique:periodo_aca,Asig',
            'Activo' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Error de validación.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        DB::transaction(function () use ($request, &$periodo) {
            // Si el nuevo periodo es activo, desactivar todos los demás
            if ($request->boolean('Activo', false)) {
                PeriodoAca::where('Activo', true)->update(['Activo' => false]);
            }

            // Si no hay ningún periodo activo, forzar este como activo
            $hayActivo = PeriodoAca::where('Activo', true)->exists();
            $activo = $request->boolean('Activo', false) || !$hayActivo;

            $periodo = PeriodoAca::create([
                'Asig'   => $request->Asig,
                'Activo' => $activo,
            ]);
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Periodo académico creado correctamente.',
            'data'    => $periodo,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $periodo = PeriodoAca::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'Asig'   => 'required|string|max:20|unique:periodo_aca,Asig,' . $id . ',Id',
            'Activo' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Error de validación.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        DB::transaction(function () use ($request, $periodo) {
            $quiereActivo = $request->boolean('Activo', false);

            // Si se activa este, desactivar los demás
            if ($quiereActivo) {
                PeriodoAca::where('Activo', true)
                    ->where('Id', '!=', $periodo->Id)
                    ->update(['Activo' => false]);
            }

            // No permitir desactivar si es el único activo
            if (!$quiereActivo && $periodo->Activo) {
                $otroActivo = PeriodoAca::where('Activo', true)
                    ->where('Id', '!=', $periodo->Id)
                    ->exists();
                if (!$otroActivo) {
                    // Mantener activo
                    $quiereActivo = true;
                }
            }

            $periodo->update([
                'Asig'   => $request->Asig,
                'Activo' => $quiereActivo,
            ]);
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Periodo académico actualizado correctamente.',
            'data'    => $periodo->fresh(),
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $periodo = PeriodoAca::findOrFail($id);

        if ($periodo->Activo) {
            return response()->json([
                'status'  => 'error',
                'message' => 'No se puede eliminar el periodo activo. Active otro periodo primero.',
            ], 422);
        }

        $periodo->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Periodo académico eliminado correctamente.',
        ]);
    }

    public function activo(): JsonResponse
    {
        $periodo = PeriodoAca::where('Activo', true)->first();
        return response()->json($periodo);
    }
}
