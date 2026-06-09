<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('DataInterna', function (Blueprint $table) {
            $table->string('DNI', 20)->primary();
            $table->string('Procedencia')->default('Interno');
            $table->string('TipoAsistente')->default('Estudiante');
            $table->string('Nombres', 200)->nullable();
            $table->string('ApPaterno', 200)->nullable();
            $table->string('ApMaterno', 200)->nullable();
            $table->string('Grado', 200)->nullable();
            $table->string('Correo', 500)->nullable();
            $table->string('NumCelular', 9)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('DataInterna');
    }
};
