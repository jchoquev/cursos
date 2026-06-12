<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TipoAsistente extends Model
{
    use SoftDeletes;

    protected $table = 'tipo_asistentes';

    protected $fillable = [
        'AsigTipo',
    ];

    public function eDocumentos(): HasMany
    {
        return $this->hasMany(EDocumento::class, 'TipoAsistente');
    }
}
