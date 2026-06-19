<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ValidarCertificadoController extends Controller
{
    public function show(string $codigo): JsonResponse
    {
        // Validación del certificado uniendo:
        //   emitir_documentos -> matriculas -> eventos
        //   + tipo_asistentes (nombre del tipo) + e_documentos (plantilla/resolución)
        $row = DB::table('emitir_documentos as ed')
            ->join('matriculas as ma', 'ed.Id_Matricula', '=', 'ma.id')
            ->join('eventos as ev', 'ev.id', '=', 'ma.evento_id')
            ->leftJoin('tipo_asistentes as ta', function ($join) {
                $join->on('ta.id', '=', 'ma.TipoAsistente')
                     ->whereNull('ta.deleted_at');
            })
            ->leftJoin('e_documentos as edoc', function ($join) {
                $join->on('edoc.Id_evento', '=', 'ma.evento_id')
                     ->on('edoc.TipoAsistente', '=', 'ma.TipoAsistente')
                     ->whereNull('edoc.deleted_at');
            })
            ->where('ed.Id_Documento', $codigo)
            ->whereNull('ed.deleted_at')
            ->whereNull('ma.deleted_at')
            ->whereNull('ev.deleted_at')
            ->select([
                'ed.Id_Documento', 'ed.Estado',
                'ma.DNI', 'ma.Nombres', 'ma.ApPaterno', 'ma.ApMaterno',
                'ma.evento_id', 'ma.TipoAsistente',
                'ta.AsigTipo',
                'ev.titulo', 'ev.HAcademica', 'ev.FnCurso', 'ev.InCurso',
                'edoc.Resolucion', 'edoc.FechEmision',
            ])
            ->first();

        if (!$row) {
            return response()->json(['valido' => false, 'mensaje' => 'Certificado no encontrado.'], 404);
        }

        if (!$row->Estado) {
            return response()->json(['valido' => false, 'mensaje' => 'Certificado inválido o revocado.'], 200);
        }

        return response()->json([
            'valido'            => true,
            'codigo'            => $row->Id_Documento,
            'nombres'           => trim("{$row->Nombres} {$row->ApPaterno} {$row->ApMaterno}"),
            'dni'               => $row->DNI,
            'evento'            => $row->titulo,
            'evento_id'         => $row->evento_id,
            'tipo_asistente_id' => $row->TipoAsistente,
            'horas'             => $row->HAcademica,
            'fecha'             => $row->FechEmision ?? $row->FnCurso ?? $row->InCurso,
            'tipo'              => $row->AsigTipo ?? 'ASISTENTE',
            'resolucion'        => $row->Resolucion,
        ]);
    }
}
