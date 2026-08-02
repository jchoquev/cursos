<?php

namespace App\Http\Controllers;

use App\Models\Proyecto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ProyectoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Proyecto::with(['linea', 'periodoAca']);

        if ($request->filled('linea_id')) {
            $query->where('Id_Linea', $request->query('linea_id'));
        }

        if ($request->filled('periodo_id')) {
            $query->where('Id_PeriodoAca', $request->query('periodo_id'));
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
            'Id_PeriodoAca' => 'required|exists:periodo_aca,Id',
            'Inicio' => 'required|date',
            'Fin' => 'nullable|date',
            'Estado' => 'required|string',
            'Ganador' => 'sometimes|boolean',
            'ImgCaratula' => 'nullable|string',
            'PdfDocumento' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error de validación.',
                'errors' => $validator->errors()
            ], 422);
        }

        $linea = \App\Models\InvLinea::find($request->input('Id_Linea'));
        if ($linea && $linea->Id_PeriodoAca !== $request->input('Id_PeriodoAca')) {
            return response()->json([
                'status' => 'error',
                'message' => 'La línea de investigación debe pertenecer al periodo académico seleccionado.',
            ], 422);
        }

        $proyecto = Proyecto::with(['linea', 'periodoAca'])->create($request->all());

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
        $proyecto = Proyecto::with(['linea', 'periodoAca'])->find($id);
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
            'Id_PeriodoAca' => 'sometimes|required|exists:periodo_aca,Id',
            'Inicio' => 'sometimes|required|date',
            'Fin' => 'nullable|date',
            'Estado' => 'sometimes|required|string',
            'Ganador' => 'sometimes|boolean',
            'ImgCaratula' => 'nullable|string',
            'PdfDocumento' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error de validación.',
                'errors' => $validator->errors()
            ], 422);
        }

        $periodoId = $request->input('Id_PeriodoAca', $proyecto->Id_PeriodoAca);
        $lineaId = $request->input('Id_Linea', $proyecto->Id_Linea);
        $linea = \App\Models\InvLinea::find($lineaId);
        if ($linea && $linea->Id_PeriodoAca !== $periodoId) {
            return response()->json([
                'status' => 'error',
                'message' => 'La línea de investigación debe pertenecer al periodo académico seleccionado.',
            ], 422);
        }

        $proyecto->update($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Proyecto actualizado correctamente.',
            'data' => $proyecto->fresh(['linea', 'periodoAca'])
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

    /**
     * Guarda el PDF original y la portada generada por el frontend.
     */
    public function uploadFiles(Request $request, string $id): JsonResponse
    {
        $proyecto = Proyecto::find($id);
        if (!$proyecto) {
            return response()->json([
                'status' => 'error',
                'message' => 'Proyecto no encontrado.'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'pdf' => 'required|file|mimes:pdf|max:10240',
            'cover_image' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'El PDF y la imagen de portada son obligatorios.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $disk = Storage::disk('public');
        $pdfFilename = Str::uuid()->toString() . '.pdf';
        $imageFilename = Str::uuid()->toString() . '.jpg';
        $pdfPath = "projects/pdf/{$pdfFilename}";
        $imagePath = "projects/images/{$imageFilename}";

        // Eliminar los archivos anteriores del proyecto antes de reemplazarlos.
        if ($proyecto->PdfDocumento) {
            $disk->delete($proyecto->PdfDocumento);
        }
        if ($proyecto->ImgCaratula) {
            $disk->delete($proyecto->ImgCaratula);
        }

        $disk->putFileAs('projects/pdf', $request->file('pdf'), $pdfFilename);
        $disk->putFileAs('projects/images', $request->file('cover_image'), $imageFilename);

        $proyecto->update([
            'PdfDocumento' => $pdfPath,
            'ImgCaratula' => $imagePath,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'PDF y portada guardados correctamente.',
            'data' => $proyecto->fresh(['linea', 'periodoAca']),
            'files' => [
                'pdf' => $pdfPath,
                'image' => $imagePath,
            ],
        ]);
    }
}
