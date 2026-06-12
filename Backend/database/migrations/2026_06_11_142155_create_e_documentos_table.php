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
        Schema::create('e_documentos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->text('Resolucion')->nullable();
            $table->text('pdfResolucion')->nullable(); // Ruta del archivo PDF en storage
            $table->text('Tipo')->nullable();
            $table->text('Texto01')->nullable();
            $table->longText('Texto02')->nullable();
            $table->date('FechEmision')->nullable();
            $table->text('Firma01')->nullable();
            $table->text('Firma02')->nullable();
            $table->text('Firma03')->nullable();
            $table->text('Fondo')->nullable(); // Ruta de imagen de fondo
            
            $table->foreignId('TipoAsistente')
                  ->default(1)
                  ->constrained('tipo_asistentes')
                  ->onDelete('cascade');
                  
            $table->string('Id_evento');
            $table->foreign('Id_evento')
                  ->references('id')
                  ->on('eventos')
                  ->onDelete('cascade');
                  
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('e_documentos');
    }
};
