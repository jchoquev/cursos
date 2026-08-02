<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('proyectos', function (Blueprint $table) {
            $table->uuid('Id_PeriodoAca')->nullable()->after('Id_Linea');
        });

        // Vincular los proyectos existentes al periodo de su línea de investigación.
        DB::table('inv_lineas')
            ->select(['Id', 'Id_PeriodoAca'])
            ->get()
            ->each(function ($linea): void {
                DB::table('proyectos')
                    ->where('Id_Linea', $linea->Id)
                    ->whereNull('Id_PeriodoAca')
                    ->update(['Id_PeriodoAca' => $linea->Id_PeriodoAca]);
            });

        Schema::table('proyectos', function (Blueprint $table) {
            $table->foreign('Id_PeriodoAca')
                ->references('Id')
                ->on('periodo_aca')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('proyectos', function (Blueprint $table) {
            $table->dropForeign(['Id_PeriodoAca']);
            $table->dropColumn('Id_PeriodoAca');
        });
    }
};
