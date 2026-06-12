<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Matricula extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'matriculas';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'DNI',
        'Procedencia',
        'TipoAsistente', // Enum: PONENTE, ASISTENTE (default), ORGANIZADOR
        'Nombres',
        'ApPaterno',
        'ApMaterno',
        'GradAcademico',
        'Correo',
        'NumCelular',
        'Pago',
        'DatoPago',
        'CertificadoGenerado',
        'evento_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'Pago' => 'boolean',
            'CertificadoGenerado' => 'boolean',
            'DatoPago' => 'array', // automatically deserializes JSON to PHP array
        ];
    }

    /**
     * Get the academic event associated with the registration.
     */
    public function evento()
    {
        return $this->belongsTo(Evento::class, 'evento_id');
    }

    /**
     * Get the assistant type associated with the registration.
     */
    public function tipoAsistenteRel()
    {
        return $this->belongsTo(TipoAsistente::class, 'TipoAsistente');
    }

    /**
     * Get the document associated with the registration.
     */
    public function documento()
    {
        return $this->hasOne(EmitirDocumento::class, 'Id_Matricula');
    }
}
