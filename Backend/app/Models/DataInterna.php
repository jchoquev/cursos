<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DataInterna extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'DataInterna';
    protected $primaryKey = 'DNI';
    public $incrementing = false;
    protected $keyType = 'string';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'DNI',
        'Procedencia',
        'TipoAsistente',
        'Nombres',
        'ApPaterno',
        'ApMaterno',
        'Grado',
        'Correo',
        'NumCelular',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'DNI' => 'string',
        'Procedencia' => 'string',
        'TipoAsistente' => 'string',
        'Nombres' => 'string',
        'ApPaterno' => 'string',
        'ApMaterno' => 'string',
        'Grado' => 'string',
        'Correo' => 'string',
        'NumCelular' => 'string',
    ];
}
