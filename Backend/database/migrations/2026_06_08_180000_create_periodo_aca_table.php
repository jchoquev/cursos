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
        Schema::create('periodo_aca', function (Blueprint $table) {
            $table->uuid('Id')->primary();
            $table->string('Asig', 20);
            $table->boolean('Activo')->default(false);
            $table->timestamps();
        });

        // Seed initial active period
        DB::table('periodo_aca')->insert([
            'Id'         => \Illuminate\Support\Str::uuid()->toString(),
            'Asig'       => '2026-I',
            'Activo'     => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('periodo_aca');
    }
};
