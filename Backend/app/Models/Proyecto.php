<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Proyecto extends Model
{
    use SoftDeletes;
    protected $table = 'proyectos';
    protected $primaryKey = 'Id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'Id',
        'num_insercion',
        'Titulo',
        'Resumen',
        'Responsable',
        'Asesor',
        'Id_Linea',
        'Id_PeriodoAca',
        'Inicio',
        'Fin',
        'Estado',
        'Ganador',
        'hidden',
        'ImgCaratula',
        'PdfDocumento'
    ];

    protected $casts = [
        'Responsable' => 'array',
        'Asesor' => 'array',
        'Ganador' => 'boolean',
        'hidden' => 'boolean',
        'Inicio' => 'date:Y-m-d',
        'Fin' => 'date:Y-m-d',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            // Calculate next sequential insertion index
            $nextSeq = (static::max('num_insercion') ?? 0) + 1;
            $model->num_insercion = $nextSeq;

            // Generate custom ID: PRO + 3 random digits + last 2 digits of current year + nextSeq
            if (empty($model->Id)) {
                $randomDigits = str_pad(rand(0, 999), 3, '0', STR_PAD_LEFT);
                $yearDigits = date('y');
                $model->Id = 'PRO' . $randomDigits . $yearDigits . $nextSeq;
            }
        });
    }

    public function linea(): BelongsTo
    {
        return $this->belongsTo(InvLinea::class, 'Id_Linea', 'Id');
    }

    public function periodoAca(): BelongsTo
    {
        return $this->belongsTo(PeriodoAca::class, 'Id_PeriodoAca', 'Id');
    }
}
