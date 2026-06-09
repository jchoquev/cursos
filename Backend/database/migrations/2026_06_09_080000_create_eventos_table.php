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
        Schema::create('eventos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->text('titulo');
            $table->string('RBanner', 200);
            $table->text('descripcion');
            $table->integer('HAcademica');
            $table->dateTime('InInscripcion');
            $table->dateTime('FnInscripcion');
            $table->dateTime('InCurso');
            $table->dateTime('FnCurso');
            $table->unsignedBigInteger('TActividad');
            $table->foreign('TActividad')->references('id')->on('tipo_actividades')->onDelete('cascade');
            $table->json('DonceteExp');
            $table->integer('CapMaxima');
            $table->boolean('Estado');
            $table->timestamps();
            $table->softDeletes(); // campo deleted_at para borrado lógico
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('eventos');
    }
};
