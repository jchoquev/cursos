<?php

namespace App\Http\Controllers;

use App\Models\Matricula;
use App\Models\Evento;
use App\Models\EmitirDocumento;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

class MatriculaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Matricula::with(['documento', 'tipoAsistenteRel'])
            ->join('eventos', 'matriculas.evento_id', '=', 'eventos.id')
            ->select('matriculas.*', 'eventos.titulo as evento_titulo')
            ->whereNull('matriculas.deleted_at')
            ->whereNull('eventos.deleted_at');

        // Exclude paid registrations unless explicitly requested (e.g. all=true for frontend stores)
        if ($request->input('all') !== 'true') {
            $query->where(function ($q) {
                $q->where('matriculas.Pago', 0)
                  ->orWhereNull('matriculas.Pago');
            });
        }

        // Search filter
        if ($request->has('search') && !empty($request->input('search'))) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('matriculas.DNI', 'like', "%{$search}%")
                  ->orWhere('matriculas.Nombres', 'like', "%{$search}%")
                  ->orWhere('matriculas.ApPaterno', 'like', "%{$search}%")
                  ->orWhere('matriculas.ApMaterno', 'like', "%{$search}%")
                  ->orWhere('matriculas.Procedencia', 'like', "%{$search}%")
                  ->orWhereHas('tipoAsistenteRel', function ($q2) use ($search) {
                      $q2->where('AsigTipo', 'like', "%{$search}%");
                  })
                  ->orWhere('matriculas.Correo', 'like', "%{$search}%")
                  ->orWhere('eventos.titulo', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'id');
        $allowedSorts = ['id', 'DNI', 'Nombres', 'ApPaterno', 'ApMaterno', 'Procedencia', 'TipoAsistente', 'Correo', 'created_at'];
        
        $sortByField = 'matriculas.id';
        if (in_array($sortBy, $allowedSorts)) {
            $sortByField = 'matriculas.' . $sortBy;
        }

        $sortDir = $request->input('sort_dir', 'desc');
        if (!in_array(strtolower($sortDir), ['asc', 'desc'])) {
            $sortDir = 'desc';
        }

        $query->orderBy($sortByField, $sortDir);

        // Support fetching all records (used by PlatformService to load into its signal store)
        if ($request->has('all') && $request->input('all') == 'true') {
            $matriculas = $query->get();
            return response()->json($matriculas);
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
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'DNI'           => 'required|string|max:20',
            'Procedencia'   => 'nullable|string',
            'TipoAsistente' => 'nullable|exists:tipo_asistentes,id',
            'Nombres'       => 'required|string|max:200',
            'ApPaterno'     => 'required|string|max:200',
            'ApMaterno'     => 'required|string|max:200',
            'GradAcademico' => 'nullable|string|max:200',
            'Correo'        => 'required|email|max:500',
            'NumCelular'    => 'required|string|max:20',
            'evento_id'     => 'required|exists:eventos,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Error de validación en los campos.',
                'errors'  => $validator->errors()
            ], 422);
        }

        // Check if student is already registered for this event
        $exists = Matricula::where('DNI', $request->DNI)
                           ->where('evento_id', $request->evento_id)
                           ->first();

        if ($exists) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Ya te encuentras registrado en este evento.'
            ], 422);
        }

        // Cargar el evento (con relación) para usar en el correo de confirmación
        $evento = Evento::with('tipoActividad')->find($request->evento_id);

        $data = $request->only([
            'DNI', 'Procedencia', 'Nombres', 'ApPaterno',
            'ApMaterno', 'GradAcademico', 'Correo', 'NumCelular', 'evento_id', 'TipoAsistente',
        ]);
        // Usar TipoAsistente del request si se proporciona, de lo contrario 1 (ASISTENTE)
        $data['TipoAsistente']       = $request->input('TipoAsistente', 1);
        $data['Pago']                = false;
        $data['DatoPago']            = [];
        $data['CertificadoGenerado'] = false;

        $matricula = Matricula::create($data);

        // Enviar correo de confirmación de registro al participante
        try {
            // $evento ya fue cargado arriba con tipoActividad
            $nombreCompleto = trim($request->Nombres . ' ' . $request->ApPaterno . ' ' . $request->ApMaterno);
            $correo = $request->Correo;
            $dni = $request->DNI;
            
            // Cargar relación tipoAsistenteRel
            $matricula->load('tipoAsistenteRel');
            $tipoAsistente = $matricula->tipoAsistenteRel ? $matricula->tipoAsistenteRel->AsigTipo : 'ASISTENTE';
            $procedencia = $request->Procedencia ?? 'N/A';
            $gradoAcademico = $request->GradAcademico ?? 'No especificado';
            $celular = $request->NumCelular;
            $codigoInscripcion = 'INS-2026-' . str_pad($matricula->id, 3, '0', STR_PAD_LEFT);
            $eventoTitulo = $evento->titulo ?? 'Evento Académico';
            $eventoTipo = '';
            if ($evento && $evento->tipoActividad) {
                $eventoTipo = $evento->tipoActividad->tipActividad ?? '';
            }
            $eventoHoras = $evento->HAcademica ?? 'N/A';
            $eventoInicio = $evento && $evento->InCurso ? $evento->InCurso->format('d/m/Y') : 'Por definir';
            $eventoFin = $evento && $evento->FnCurso ? $evento->FnCurso->format('d/m/Y') : 'Por definir';
            $expositores = '';
            if ($evento && $evento->DonceteExp) {
                $rawExp = $evento->DonceteExp;
                // Si es un string JSON, decodificarlo
                if (is_string($rawExp)) {
                    $decoded = json_decode($rawExp, true);
                    if (is_array($decoded)) {
                        $rawExp = $decoded;
                    }
                }
                if (is_array($rawExp)) {
                    // Filtrar elementos vacíos y unir con coma
                    $expositores = implode(', ', array_filter($rawExp, fn($v) => !empty(trim((string)$v))));
                } else {
                    $expositores = (string) $rawExp;
                }
            }
            $fechaRegistro = now()->format('d/m/Y H:i');

            $htmlContent = "
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='utf-8'>
                <title>Ficha de Registro de Participante</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        background-color: #0b0f19;
                        color: #f1f5f9;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 620px;
                        margin: 40px auto;
                        background: linear-gradient(145deg, #111827, #0f172a);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        border-radius: 24px;
                        overflow: hidden;
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
                    }
                    .header {
                        background: linear-gradient(135deg, #881337 0%, #4c0519 100%);
                        padding: 40px 20px;
                        text-align: center;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    }
                    .logo { font-size: 36px; margin-bottom: 10px; }
                    .title {
                        color: #ffffff;
                        font-size: 22px;
                        font-weight: 800;
                        margin: 0;
                        letter-spacing: -0.5px;
                    }
                    .subtitle {
                        color: #fda4af;
                        font-size: 13px;
                        font-weight: 500;
                        margin-top: 6px;
                        margin-bottom: 0;
                        text-transform: uppercase;
                        letter-spacing: 1.5px;
                    }
                    .content { padding: 35px 30px; }
                    .welcome {
                        font-size: 15px;
                        line-height: 1.7;
                        color: #cbd5e1;
                        margin-bottom: 25px;
                    }
                    .section-title {
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        color: #f59e0b;
                        margin-bottom: 14px;
                        padding-bottom: 8px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                    }
                    .info-card {
                        background-color: rgba(255, 255, 255, 0.03);
                        border: 1px solid rgba(255, 255, 255, 0.06);
                        border-radius: 16px;
                        padding: 22px;
                        margin-bottom: 20px;
                    }
                    .info-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        padding: 8px 0;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.03);
                    }
                    .info-row:last-child { border-bottom: none; }
                    .info-label {
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                        color: #94a3b8;
                        letter-spacing: 1px;
                        min-width: 160px;
                    }
                    .info-value {
                        font-size: 14px;
                        color: #ffffff;
                        font-weight: 600;
                        text-align: right;
                    }
                    .code-badge {
                        font-family: 'Consolas', 'Courier New', monospace;
                        font-size: 18px;
                        color: #fbbf24;
                        background-color: rgba(0, 0, 0, 0.3);
                        padding: 8px 16px;
                        border-radius: 8px;
                        border: 1px solid rgba(245, 158, 11, 0.2);
                        display: inline-block;
                        letter-spacing: 2px;
                    }
                    .status-tag {
                        background-color: rgba(245, 158, 11, 0.1);
                        color: #f59e0b;
                        border: 1px solid rgba(245, 158, 11, 0.2);
                        padding: 4px 14px;
                        border-radius: 9999px;
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .notice {
                        font-size: 12px;
                        color: #94a3b8;
                        line-height: 1.6;
                        margin-top: 20px;
                        padding: 16px;
                        background-color: rgba(255, 255, 255, 0.02);
                        border-radius: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.04);
                    }
                    .footer {
                        padding: 24px 30px;
                        background-color: rgba(0, 0, 0, 0.2);
                        border-top: 1px solid rgba(255, 255, 255, 0.05);
                        text-align: center;
                        font-size: 11px;
                        color: #64748b;
                        line-height: 1.5;
                    }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <div class='logo'>📝</div>
                        <h1 class='title'>Ficha de Registro de Participante</h1>
                        <p class='subtitle'>IESTP Chojata — Cursos e Investigación</p>
                    </div>
                    <div class='content'>
                        <p class='welcome'>
                            Estimado/a <strong>{$nombreCompleto}</strong>,<br><br>
                            Su inscripción ha sido registrada exitosamente. A continuación se detallan los datos de su ficha de registro:
                        </p>

                        <div style='text-align: center; margin-bottom: 25px;'>
                            <div style='font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 1.5px; margin-bottom: 8px;'>Código de Inscripción</div>
                            <div class='code-badge'>{$codigoInscripcion}</div>
                        </div>

                        <div class='section-title'>👤 Datos del Participante</div>
                        <div class='info-card'>
                            <div class='info-row'>
                                <span class='info-label'>Nombre Completo</span>
                                <span class='info-value'>{$nombreCompleto}</span>
                            </div>
                            <div class='info-row'>
                                <span class='info-label'>DNI</span>
                                <span class='info-value' style='font-family: monospace;'>{$dni}</span>
                            </div>
                            <div class='info-row'>
                                <span class='info-label'>Correo Electrónico</span>
                                <span class='info-value'>{$correo}</span>
                            </div>
                            <div class='info-row'>
                                <span class='info-label'>Celular</span>
                                <span class='info-value' style='font-family: monospace;'>{$celular}</span>
                            </div>
                            <div class='info-row'>
                                <span class='info-label'>Tipo de Asistente</span>
                                <span class='info-value'>{$tipoAsistente}</span>
                            </div>
                            <div class='info-row'>
                                <span class='info-label'>Procedencia</span>
                                <span class='info-value'>{$procedencia}</span>
                            </div>
                            <div class='info-row'>
                                <span class='info-label'>Grado Académico</span>
                                <span class='info-value'>{$gradoAcademico}</span>
                            </div>
                        </div>

                        <div class='section-title'>📚 Datos del Evento Académico</div>
                        <div class='info-card'>
                            <div class='info-row'>
                                <span class='info-label'>Evento / Curso</span>
                                <span class='info-value' style='color: #fbbf24;'>{$eventoTitulo}</span>
                            </div>
                            <div class='info-row'>
                                <span class='info-label'>Tipo de Actividad</span>
                                <span class='info-value'>{$eventoTipo}</span>
                            </div>
                            <div class='info-row'>
                                <span class='info-label'>Horas Académicas</span>
                                <span class='info-value'>{$eventoHoras} horas</span>
                            </div>
                            <div class='info-row'>
                                <span class='info-label'>Fecha de Inicio</span>
                                <span class='info-value' style='font-family: monospace;'>{$eventoInicio}</span>
                            </div>
                            <div class='info-row'>
                                <span class='info-label'>Fecha de Fin</span>
                                <span class='info-value' style='font-family: monospace;'>{$eventoFin}</span>
                            </div>
                            <div class='info-row'>
                                <span class='info-label'>Expositor(es)</span>
                                <span class='info-value'>{$expositores}</span>
                            </div>
                        </div>

                        <div style='text-align: center; margin: 20px 0;'>
                            <div style='font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 1.5px; margin-bottom: 8px;'>Estado de Solicitud</div>
                            <span class='status-tag'>⏳ Pendiente de Aprobación</span>
                        </div>

                        <div style='text-align: center; margin-bottom: 10px; font-size: 11px; color: #64748b;'>
                            Fecha de Registro: {$fechaRegistro}
                        </div>

                        <div class='notice'>
                            📌 <strong>Nota importante:</strong> Esta ficha acredita su solicitud formal de inscripción al evento académico.
                            Una vez aprobada por la secretaría académica, recibirá la confirmación correspondiente.
                            Conserve su código de inscripción <strong>{$codigoInscripcion}</strong> para cualquier consulta.
                        </div>
                    </div>
                    <div class='footer'>
                        Este es un correo automático generado por el sistema de gestión académica de IESTP Chojata.<br>
                        Por favor no responda a este mensaje.<br>
                        &copy; 2026 IESTP Chojata — Oficina de Tecnologías de la Información. Todos los derechos reservados.
                    </div>
                </div>
            </body>
            </html>
            ";

            Mail::send([], [], function ($message) use ($correo, $htmlContent, $nombreCompleto, $codigoInscripcion) {
                $message->to($correo)
                        ->subject('📝 Ficha de Registro de Participante ' . $codigoInscripcion . ' - IESTP Chojata')
                        ->html($htmlContent);
            });
        } catch (\Exception $e) {
            logger()->error('Error enviando correo de registro de participante: ' . $e->getMessage());
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Inscripción registrada correctamente. Pendiente de aprobación.',
            'data' => $matricula
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(int $id): JsonResponse
    {
        $matricula = Matricula::with(['evento', 'tipoAsistenteRel'])->findOrFail($id);
        return response()->json($matricula);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $matricula = Matricula::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'Procedencia' => 'nullable|string',
            'TipoAsistente' => 'nullable|exists:tipo_asistentes,id',
            'Nombres' => 'required|string|max:200',
            'ApPaterno' => 'required|string|max:200',
            'ApMaterno' => 'required|string|max:200',
            'GradAcademico' => 'nullable|string|max:200',
            'Correo' => 'required|email|max:500',
            'NumCelular' => 'required|string|max:20',
            'Pago' => 'nullable|boolean',
            'DatoPago' => 'nullable|array',
            'CertificadoGenerado' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $matricula->update($request->all());

        return response()->json([
            'status'  => 'success',
            'message' => 'Matrícula actualizada con éxito.',
            'data'    => $matricula
        ]);
    }

    /**
     * Validar el pago de una matrícula.
     */
    public function validarPago(Request $request, int $id): JsonResponse
    {
        $matricula = Matricula::findOrFail($id);

        $isGratuito = filter_var($request->input('EsGratuito'), FILTER_VALIDATE_BOOLEAN);

        if ($isGratuito) {
            $matricula->update([
                'Pago' => true,
            ]);
        } else {
            $validator = Validator::make($request->all(), [
                'NumRecibo'   => 'required|string|max:100',
                'FechaPago'   => 'required|date',
                'MontoPago'   => 'required|numeric|min:0',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Datos del pago incompletos.',
                    'errors'  => $validator->errors()
                ], 422);
            }

            $matricula->update([
                'Pago'     => true,
                'DatoPago' => [
                    'NumRecibo' => $request->NumRecibo,
                    'FechaPago' => $request->FechaPago,
                    'MontoPago' => $request->MontoPago,
                ],
            ]);
        }

        // Delete any existing document for this matricula to avoid constraint violations
        EmitirDocumento::where('Id_Matricula', $matricula->id)->forceDelete();

        // Generate Id_Documento
        $yearDigits = date('y');
        
        $randomChars = '';
        $characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        for ($i = 0; $i < 3; $i++) {
            $randomChars .= $characters[random_int(0, strlen($characters) - 1)];
        }
        
        $dniDigits = str_pad(substr($matricula->DNI, -2), 2, '0', STR_PAD_LEFT);
        
        // Count how many validated payments for this course (includes the current one)
        $order = Matricula::where('evento_id', $matricula->evento_id)
            ->where('Pago', true)
            ->count();
        $orderDigits = str_pad($order, 3, '0', STR_PAD_LEFT);
        
        $idDocumento = $yearDigits . $randomChars . $dniDigits . $orderDigits;

        EmitirDocumento::create([
            'Id_Documento' => $idDocumento,
            'Id_Matricula' => $matricula->id,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Pago validado correctamente.',
            'data'    => $matricula->fresh()
        ]);
    }

    public function emitirCertificado(int $id): JsonResponse
    {
        $matricula = Matricula::findOrFail($id);

        $documento = EmitirDocumento::where('Id_Matricula', $matricula->id)->first();
        if ($documento) {
            $documento->update(['Estado' => true]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Certificado emitido correctamente.',
            'documento' => $documento
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(int $id): JsonResponse
    {
        $matricula = Matricula::findOrFail($id);
        $matricula->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Matrícula eliminada con éxito.'
        ]);
    }
}
