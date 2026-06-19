<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PeriodoAca extends Model
{
    protected $table = 'periodo_aca';
    protected $primaryKey = 'Id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['Id', 'Asig', 'Activo'];

    protected $casts = [
        'Activo' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->Id)) {
                $model->Id = Str::uuid()->toString();
            }
        });
    }
}
