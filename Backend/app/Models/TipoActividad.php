<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TipoActividad extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'tipo_actividades';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tipActividad',
    ];
}
