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
        Schema::create('matriculas', function (Blueprint $table) {
            $table->id();
            $table->string('DNI', 20);
            $table->string('Procedencia')->default('Externo');
            $table->foreignId('TipoAsistente')->default(1)->constrained('tipo_asistentes');
            $table->string('Nombres', 200);
            $table->string('ApPaterno', 200);
            $table->string('ApMaterno', 200);
            $table->string('GradAcademico', 200)->nullable();
            $table->string('Correo', 500);
            $table->string('NumCelular', 20);
            $table->boolean('Pago')->default(false);
            $table->json('DatoPago')->nullable();
            $table->boolean('CertificadoGenerado')->default(false);
            $table->uuid('evento_id');
            $table->foreign('evento_id')->references('id')->on('eventos')->onDelete('cascade');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('matriculas');
    }
};
