<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Elimina la columna Evento desnormalizada de matriculas.
     * Es redundante ya que evento_id (FK) es suficiente.
     */
    public function up(): void
    {
        Schema::table('matriculas', function (Blueprint $table) {
            $table->dropColumn('Evento');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('matriculas', function (Blueprint $table) {
            $table->string('Evento', 500)->nullable()->after('evento_id');
        });
    }
};
