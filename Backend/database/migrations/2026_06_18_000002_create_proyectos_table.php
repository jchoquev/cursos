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
        Schema::create('proyectos', function (Blueprint $table) {
            $table->string('Id', 50)->primary();
            $table->unsignedInteger('num_insercion');
            $table->text('Titulo');
            $table->text('Resumen');
            $table->json('Responsable');
            $table->json('Asesor');
            $table->uuid('Id_Linea');
            $table->date('Inicio');
            $table->date('Fin')->nullable()->default(null);
            $table->string('Estado');
            $table->boolean('Ganador')->default(false);
            $table->string('ImgCaratula')->nullable()->default(null);
            $table->string('PdfDocumento')->nullable()->default(null);
            $table->timestamps();

            $table->foreign('Id_Linea')->references('Id')->on('inv_lineas')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('proyectos');
    }
};
