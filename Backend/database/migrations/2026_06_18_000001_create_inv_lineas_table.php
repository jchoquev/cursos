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
        Schema::create('inv_lineas', function (Blueprint $table) {
            $table->uuid('Id')->primary();
            $table->uuid('Id_PeriodoAca');
            $table->text('Linea');
            $table->timestamps();

            $table->foreign('Id_PeriodoAca')->references('Id')->on('periodo_aca')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inv_lineas');
    }
};
