<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tipo_actividades', function (Blueprint $table) {
            $table->id();
            $table->string('tipActividad', 100);
            $table->timestamps();
        });

        // Seed default values
        DB::table('tipo_actividades')->insert([
            ['tipActividad' => 'Curso', 'created_at' => now(), 'updated_at' => now()],
            ['tipActividad' => 'Taller', 'created_at' => now(), 'updated_at' => now()],
            ['tipActividad' => 'Seminario', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tipo_actividades');
    }
};
