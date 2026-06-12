<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class EDocumento extends Model
{
    use SoftDeletes, HasUuids;

    protected $table = 'e_documentos';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'Resolucion',
        'pdfResolucion',
        'Tipo',
        'Texto01',
        'Texto02',
        'FechEmision',
        'Firma01',
        'Firma02',
        'Firma03',
        'Fondo',
        'TipoAsistente',
        'Id_evento',
    ];

    protected $casts = [
        'FechEmision' => 'date',
    ];

    public function tipoAsistenteRel(): BelongsTo
    {
        return $this->belongsTo(TipoAsistente::class, 'TipoAsistente');
    }

    public function evento(): BelongsTo
    {
        return $this->belongsTo(Evento::class, 'Id_evento');
    }
}
