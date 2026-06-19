<?php

namespace Database\Seeders;

use App\Models\InvLinea;
use App\Models\PeriodoAca;
use Illuminate\Database\Seeder;

class InvLineaSeeder extends Seeder
{
    public function run(): void
    {
        if (InvLinea::count() > 0) {
            return;
        }

        $periodo = PeriodoAca::where('Activo', true)->first();
        if (!$periodo) {
            $this->command->warn('No hay periodo académico activo. Ejecuta primero el seeder de PeriodoAca.');
            return;
        }

        InvLinea::create([
            'Id_PeriodoAca' => $periodo->Id,
            'Linea'         => 'Inteligencia Artificial y Aprendizaje Automático Aplicado a la Agricultura',
        ]);

        InvLinea::create([
            'Id_PeriodoAca' => $periodo->Id,
            'Linea'         => 'Desarrollo de Software y Tecnologías Emergentes en Educación',
        ]);
    }
}
