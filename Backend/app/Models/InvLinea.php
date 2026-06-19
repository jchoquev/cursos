<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class InvLinea extends Model
{
    use SoftDeletes;
    protected $table = 'inv_lineas';
    protected $primaryKey = 'Id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['Id', 'Id_PeriodoAca', 'Linea'];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->Id)) {
                $model->Id = Str::uuid()->toString();
            }
        });
    }

    public function periodoAca(): BelongsTo
    {
        return $this->belongsTo(PeriodoAca::class, 'Id_PeriodoAca', 'Id');
    }

    public function proyectos(): HasMany
    {
        return $this->hasMany(Proyecto::class, 'Id_Linea', 'Id');
    }
}
