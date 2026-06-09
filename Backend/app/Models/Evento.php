<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Evento extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'eventos';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'titulo',
        'RBanner',
        'descripcion',
        'HAcademica',
        'InInscripcion',
        'FnInscripcion',
        'InCurso',
        'FnCurso',
        'TActividad',
        'DonceteExp',
        'CapMaxima',
        'Estado',
    ];

    protected $casts = [
        'id' => 'string',
        'InInscripcion' => 'datetime',
        'FnInscripcion' => 'datetime',
        'InCurso' => 'datetime',
        'FnCurso' => 'datetime',
        'DonceteExp' => 'array',
        'Estado' => 'boolean',
    ];

    public function tipoActividad()
    {
        return $this->belongsTo(TipoActividad::class, 'TActividad');
    }
}
