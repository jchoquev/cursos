<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEventoRequest;
use App\Models\Evento;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class EventoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $eventos = Evento::with('tipoActividad')->orderBy('created_at', 'desc')->get();
        return response()->json($eventos);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreEventoRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['id'] = (string) Str::uuid();

        // Manejar la subida de imagen del banner
        if ($request->hasFile('RBanner')) {
            $file = $request->file('RBanner');
            $filename = $data['id'] . '_' . time() . '.' . $file->getClientOriginalExtension();
            // Guardar en storage/app/public/baner/
            $file->storeAs('baner', $filename, 'public');
            // Almacenar la ruta relativa en la base de datos
            $data['RBanner'] = 'baner/' . $filename;
        }

        // Ensure DonceteExp is stored as JSON string
        if (is_string($data['DonceteExp'])) {
            $decoded = json_decode($data['DonceteExp'], true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $data['DonceteExp'] = json_encode([$data['DonceteExp']]);
            }
        }

        if (is_array($data['DonceteExp'])) {
            $data['DonceteExp'] = json_encode($data['DonceteExp']);
        }

        $evento = Evento::create($data);

        return response()->json([
            'message' => 'Evento creado correctamente.',
            'data'    => $evento->load('tipoActividad'),
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $evento = Evento::with('tipoActividad')->findOrFail($id);
        return response()->json($evento);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $evento = Evento::findOrFail($id);

        $data = $request->all();

        // Manejar actualización de imagen del banner
        if ($request->hasFile('RBanner')) {
            $file = $request->file('RBanner');
            $filename = $id . '_' . time() . '.' . $file->getClientOriginalExtension();
            // Guardar en el disco público (storage/app/public/baner/)
            $file->storeAs('baner', $filename, 'public');
            $data['RBanner'] = 'baner/' . $filename;
        }

        // Asegurar que DonceteExp se guarde como string JSON en la base de datos
        if (isset($data['DonceteExp'])) {
            if (is_string($data['DonceteExp'])) {
                $decoded = json_decode($data['DonceteExp'], true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    $data['DonceteExp'] = json_encode([$data['DonceteExp']]);
                }
            }

            if (is_array($data['DonceteExp'])) {
                $data['DonceteExp'] = json_encode($data['DonceteExp']);
            }
        }

        $evento->update($data);

        return response()->json([
            'message' => 'Evento actualizado correctamente.',
            'data'    => $evento->fresh()->load('tipoActividad'),
        ]);
    }

    /**
     * Remove the specified resource from storage (soft delete).
     */
    public function destroy(string $id): JsonResponse
    {
        $evento = Evento::findOrFail($id);
        $evento->delete(); // soft delete

        return response()->json([
            'message' => 'Evento eliminado correctamente.',
        ]);
    }

    public function getBannerBase64(string $id): JsonResponse
    {
        $evento = Evento::findOrFail($id);
        $path = $evento->RBanner;

        // Check public disk (storage/app/public)
        if ($path && Storage::disk('public')->exists($path)) {
            $file = Storage::disk('public')->get($path);
            $mimeType = Storage::disk('public')->mimeType($path);
            $base64 = base64_encode($file);

            return response()->json([
                'base64' => 'data:' . $mimeType . ';base64,' . $base64
            ]);
        }

        // Fallback: Check local disk (storage/app/private)
        if ($path && Storage::disk('local')->exists($path)) {
            $file = Storage::disk('local')->get($path);
            $mimeType = Storage::disk('local')->mimeType($path);
            $base64 = base64_encode($file);

            return response()->json([
                'base64' => 'data:' . $mimeType . ';base64,' . $base64
            ]);
        }

        return response()->json([
            'message' => 'Imagen no encontrada.'
        ], 404);
    }
}
