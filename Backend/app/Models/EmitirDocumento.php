<?php
 
namespace App\Models;
 
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
 
class EmitirDocumento extends Model
{
    use HasFactory, SoftDeletes;
 
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'emitir_documentos';
 
    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'Id_Documento';
 
    /**
     * The "type" of the primary key.
     *
     * @var string
     */
    protected $keyType = 'string';
 
    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = false;
 
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'Id_Documento',
        'Id_Matricula',
        'Estado',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'Estado' => 'boolean',
        ];
    }
 
    /**
     * Get the registration associated with the document.
     */
    public function matricula()
    {
        return $this->belongsTo(Matricula::class, 'Id_Matricula');
    }
}
