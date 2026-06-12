<?php

namespace App\Http\Controllers;

use App\Models\EDocumento;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class EDocumentoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $eventId = $request->query('evento_id');
        if (!$eventId) {
            return response()->json([]);
        }
        $configs = EDocumento::with('tipoAsistenteRel')
            ->where('Id_evento', $eventId)
            ->get();
        return response()->json($configs);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'id'            => 'nullable|string',
            'Id_evento'     => 'required|exists:eventos,id',
            'TipoAsistente' => 'required|exists:tipo_asistentes,id',
            'Resolucion'    => 'nullable|string',
            'pdfResolucion' => 'nullable|file|mimes:pdf|max:10240',
            'Tipo'          => 'nullable|string',
            'Texto01'       => 'nullable|string',
            'Texto02'       => 'nullable|string',
            'FechEmision'   => 'nullable|date',
            'Firma01'       => 'nullable|string',
            'Firma02'       => 'nullable|string',
            'Firma03'       => 'nullable|string',
            'Fondo'         => 'nullable|file|image|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Error de validación.',
                'errors'  => $validator->errors()
            ], 422);
        }

        $existingConfig = null;

        if ($request->filled('id')) {
            $existingConfig = EDocumento::find($request->id);
            if (!$existingConfig) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'La plantilla a actualizar no existe.'
                ], 404);
            }

            // Verify there is no other config with the same TipoAsistente for this event
            $duplicate = EDocumento::where('Id_evento', $request->Id_evento)
                ->where('TipoAsistente', $request->TipoAsistente)
                ->where('id', '!=', $request->id)
                ->exists();
            if ($duplicate) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Ya existe otra plantilla configurada para este rol en este curso.'
                ], 422);
            }
        } else {
            // We are creating a new config, so verify there is no existing config with this TipoAsistente
            $duplicate = EDocumento::where('Id_evento', $request->Id_evento)
                ->where('TipoAsistente', $request->TipoAsistente)
                ->exists();
            if ($duplicate) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Ya existe una plantilla configurada para este rol en este curso.'
                ], 422);
            }
        }

        $data = $request->except(['id', 'pdfResolucion', 'Fondo']);

        if ($request->hasFile('pdfResolucion')) {
            // Delete existing PDF if it exists
            if ($existingConfig && $existingConfig->pdfResolucion) {
                Storage::disk('public')->delete($existingConfig->pdfResolucion);
            }
            $file = $request->file('pdfResolucion');
            $filename = Str::uuid()->toString() . '.' . $file->getClientOriginalExtension();
            $file->storeAs('resolucion', $filename, 'public');
            $data['pdfResolucion'] = 'resolucion/' . $filename;
        }

        if ($request->hasFile('Fondo')) {
            // Delete existing background image if it exists
            if ($existingConfig && $existingConfig->Fondo) {
                Storage::disk('public')->delete($existingConfig->Fondo);
            }
            $file = $request->file('Fondo');
            $filename = Str::uuid()->toString() . '.' . $file->getClientOriginalExtension();
            $file->storeAs('FondoDocumeto', $filename, 'public');
            $data['Fondo'] = 'FondoDocumeto/' . $filename;
        }

        if ($existingConfig) {
            $existingConfig->update($data);
            $config = $existingConfig;
        } else {
            $config = EDocumento::create(array_merge([
                'Id_evento'     => $request->Id_evento,
                'TipoAsistente' => $request->TipoAsistente,
            ], $data));
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Configuración de documento guardada correctamente.',
            'data'    => $config
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $config = EDocumento::find($id);
        if (!$config) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Configuración no encontrada.'
            ], 404);
        }

        // Delete associated files from storage
        if ($config->pdfResolucion) {
            Storage::disk('public')->delete($config->pdfResolucion);
        }
        if ($config->Fondo) {
            Storage::disk('public')->delete($config->Fondo);
        }

        $config->delete();
        return response()->json([
            'status'  => 'success',
            'message' => 'Configuración de documento eliminada correctamente.'
        ]);
    }

    /**
     * Obtener el fondo del e-documento en base64 y sus datos configurados.
     */
    public function getFondoBase64(\Illuminate\Http\Request $request): \Illuminate\Http\JsonResponse
    {
        $eventoId = $request->query('evento_id');
        $tipoAsistente = $request->query('tipo_asistente');

        if (!$eventoId || !$tipoAsistente) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Faltan parámetros requeridos: evento_id y tipo_asistente.'
            ], 400);
        }

        $config = EDocumento::where('Id_evento', $eventoId)
            ->where('TipoAsistente', $tipoAsistente)
            ->first();

        if (!$config) {
            return response()->json([
                'status'  => 'error',
                'message' => 'No se encontró la configuración del e-documento para este evento y tipo de asistente.'
            ], 404);
        }

        $base64 = null;
        if ($config->Fondo && \Illuminate\Support\Facades\Storage::disk('public')->exists($config->Fondo)) {
            $fileContent = \Illuminate\Support\Facades\Storage::disk('public')->get($config->Fondo);
            $mimeType = \Illuminate\Support\Facades\Storage::disk('public')->mimeType($config->Fondo) ?: 'image/png';
            $base64 = 'data:' . $mimeType . ';base64,' . base64_encode($fileContent);
        }

        return response()->json([
            'status'       => 'success',
            'fondo_base64' => $base64,
            'e_documento'  => $config
        ]);
    }
}
