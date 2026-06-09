<?php

namespace App\Http\Controllers;

use App\Models\DataInterna;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class DataInternaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = DataInterna::query();

        // Search filter
        if ($request->has('search') && !empty($request->input('search'))) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('DNI', 'like', "%{$search}%")
                  ->orWhere('Nombres', 'like', "%{$search}%")
                  ->orWhere('ApPaterno', 'like', "%{$search}%")
                  ->orWhere('ApMaterno', 'like', "%{$search}%")
                  ->orWhere('Procedencia', 'like', "%{$search}%")
                  ->orWhere('TipoAsistente', 'like', "%{$search}%")
                  ->orWhere('Correo', 'like', "%{$search}%")
                  ->orWhere('Grado', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'DNI');
        $allowedSorts = ['DNI', 'Nombres', 'ApPaterno', 'ApMaterno', 'Procedencia', 'TipoAsistente', 'Correo', 'Grado'];
        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'DNI';
        }

        $sortDir = $request->input('sort_dir', 'asc');
        if (!in_array(strtolower($sortDir), ['asc', 'desc'])) {
            $sortDir = 'asc';
        }

        if ($sortBy === 'Nombres') {
            $query->orderBy('ApPaterno', $sortDir)
                  ->orderBy('ApMaterno', $sortDir)
                  ->orderBy('Nombres', $sortDir);
        } else {
            $query->orderBy($sortBy, $sortDir);
        }

        // Pagination
        $perPage = (int) $request->input('per_page', 10);
        if ($perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }

        $paginated = $query->paginate($perPage);

        return response()->json([
            'data' => $paginated->items(),
            'total' => $paginated->total(),
            'per_page' => $paginated->perPage(),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'DNI' => 'required|string|max:20|unique:DataInterna,DNI',
            'Procedencia' => 'nullable|string',
            'TipoAsistente' => 'nullable|string',
            'Nombres' => 'required|string|max:200',
            'ApPaterno' => 'required|string|max:200',
            'ApMaterno' => 'required|string|max:200',
            'Grado' => 'nullable|string|max:200',
            'Correo' => 'nullable|email|max:500',
            'NumCelular' => 'nullable|string|max:9',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $record = DataInterna::create($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Registro interno creado con éxito.',
            'data' => $record
        ], 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $dni)
    {
        $record = DataInterna::where('DNI', $dni)->firstOrFail();

        $validator = Validator::make($request->all(), [
            'Procedencia' => 'nullable|string',
            'TipoAsistente' => 'nullable|string',
            'Nombres' => 'required|string|max:200',
            'ApPaterno' => 'required|string|max:200',
            'ApMaterno' => 'required|string|max:200',
            'Grado' => 'nullable|string|max:200',
            'Correo' => 'nullable|email|max:500',
            'NumCelular' => 'nullable|string|max:9',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $record->update($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Registro interno actualizado con éxito.',
            'data' => $record
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($dni)
    {
        $record = DataInterna::where('DNI', $dni)->firstOrFail();
        $record->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Registro interno eliminado con éxito.'
        ]);
    }

    /**
     * Bulk import from CSV/Excel text file.
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file'
        ]);

        $file = $request->file('file');
        $filePath = $file->getRealPath();

        $handle = fopen($filePath, 'r');
        if (!$handle) {
            return response()->json([
                'status' => 'error',
                'message' => 'No se pudo abrir el archivo cargado.'
            ], 400);
        }

        // Detect separator (comma or semicolon)
        $headerLine = fgets($handle);
        // Strip BOM if present
        if (substr($headerLine, 0, 3) === "\xef\xbb\xbf") {
            $headerLine = substr($headerLine, 3);
        }
        
        $separator = ',';
        if (strpos($headerLine, ';') !== false) {
            $separator = ';';
        }
        rewind($handle);

        $firstRow = fgets($handle);
        // Strip BOM again from the first row read
        if (substr($firstRow, 0, 3) === "\xef\xbb\xbf") {
            $firstRow = substr($firstRow, 3);
        }
        $headers = str_getcsv($firstRow, $separator);
        
        // Normalize headers
        $headers = array_map(function ($h) {
            return trim(strtolower($h));
        }, $headers);

        $fieldMap = [
            'dni' => 'DNI',
            'procedencia' => 'Procedencia',
            'tipoasistente' => 'TipoAsistente',
            'tipo asistente' => 'TipoAsistente',
            'tipo_asistente' => 'TipoAsistente',
            'nombres' => 'Nombres',
            'nombre' => 'Nombres',
            'appaterno' => 'ApPaterno',
            'ap_paterno' => 'ApPaterno',
            'apellido paterno' => 'ApPaterno',
            'apellidopaterno' => 'ApPaterno',
            'apmaterno' => 'ApMaterno',
            'ap_materno' => 'ApMaterno',
            'apellido materno' => 'ApMaterno',
            'apellidomaterno' => 'ApMaterno',
            'grado' => 'Grado',
            'correo' => 'Correo',
            'email' => 'Correo',
            'numcelular' => 'NumCelular',
            'celular' => 'NumCelular',
            'telefono' => 'NumCelular',
            'num_celular' => 'NumCelular',
        ];

        $imported = 0;
        $updated = 0;
        $errors = [];
        $rowNum = 1;

        DB::beginTransaction();

        try {
            while (($row = fgetcsv($handle, 0, $separator)) !== false) {
                $rowNum++;
                
                // Skip completely empty rows
                if (empty(array_filter($row))) {
                    continue;
                }

                if (count($row) < count($headers)) {
                    $row = array_pad($row, count($headers), '');
                }

                $data = [];
                foreach ($headers as $index => $header) {
                    if (isset($fieldMap[$header]) && isset($row[$index])) {
                        $fieldName = $fieldMap[$header];
                        $val = trim($row[$index]);
                        $data[$fieldName] = $val === '' ? null : $val;
                    }
                }

                if (empty($data['DNI'])) {
                    $errors[] = "Fila {$rowNum}: El campo DNI es obligatorio.";
                    continue;
                }

                if (empty($data['Nombres']) || empty($data['ApPaterno'])) {
                    $errors[] = "Fila {$rowNum} (DNI {$data['DNI']}): Nombres y Apellido Paterno son obligatorios.";
                    continue;
                }

                // Default values
                if (empty($data['Procedencia'])) {
                    $data['Procedencia'] = 'Interno';
                }
                if (empty($data['TipoAsistente'])) {
                    $data['TipoAsistente'] = 'Estudiante';
                }

                $existing = DataInterna::withTrashed()->where('DNI', $data['DNI'])->first();
                if ($existing) {
                    if ($existing->trashed()) {
                        $existing->restore();
                    }
                    $existing->update($data);
                    $updated++;
                } else {
                    DataInterna::create($data);
                    $imported++;
                }
            }
            fclose($handle);
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            fclose($handle);
            return response()->json([
                'status' => 'error',
                'message' => 'Error al procesar el archivo CSV: ' . $e->getMessage()
            ], 500);
        }

        return response()->json([
            'status' => 'success',
            'message' => "Importación completada. Creados: {$imported}, Actualizados: {$updated}.",
            'imported' => $imported,
            'updated' => $updated,
            'errors' => $errors
        ]);
    }
}
