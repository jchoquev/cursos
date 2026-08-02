<?php

namespace Database\Seeders;

use App\Models\InvLinea;
use App\Models\PeriodoAca;
use App\Models\Proyecto;
use Illuminate\Database\Seeder;

class CienProyectosSeeder extends Seeder
{
    public function run(): void
    {
        $periodos = PeriodoAca::orderBy('Asig')->get();

        if ($periodos->isEmpty()) {
            $this->command->error('No hay periodos académicos disponibles.');
            return;
        }

        $asignaciones = [];
        foreach ($periodos as $periodo) {
            $lineas = InvLinea::where('Id_PeriodoAca', $periodo->Id)->get();

            if ($lineas->isEmpty()) {
                $lineas = collect([
                    InvLinea::create([
                        'Id_PeriodoAca' => $periodo->Id,
                        'Linea' => "Innovación y Desarrollo Aplicado - {$periodo->Asig}",
                    ]),
                ]);
            }

            foreach ($lineas as $linea) {
                $asignaciones[] = [$periodo, $linea];
            }
        }

        $responsables = [
            'Juan Choque Quispe',
            'María Elena Quispe Torres',
            'Carlos Huanca Layme',
            'Sofía Cárdenas Medina',
            'Luis Peralta Vega',
            'Rosa Mamani Condori',
            'Diego Apaza Quispe',
            'Valeria Flores Pinto',
        ];

        $asesores = [
            'Ing. Francisco Carranza',
            'Ing. Gustavo Alarcón',
            'Dra. Clara Valdivia',
            'Mg. Patricia Sotomayor',
        ];

        $estados = ['Planteamiento', 'En Proceso', 'En Ejecución', 'Concluido', 'Suspendido'];
        $creados = [];

        for ($indice = 0; $indice < 100; $indice++) {
            [$periodo, $linea] = $asignaciones[$indice % count($asignaciones)];
            $numero = str_pad((string) ($indice + 1), 3, '0', STR_PAD_LEFT);
            $titulo = "Proyecto de investigación demostrativo {$numero} - {$linea->Linea}";

            $proyecto = Proyecto::firstOrCreate(
                ['Titulo' => $titulo],
                [
                    'Resumen' => "Proyecto demostrativo de investigación aplicada para la línea {$linea->Linea}, correspondiente al periodo académico {$periodo->Asig}.",
                    'Responsable' => [$responsables[$indice % count($responsables)]],
                    'Asesor' => [$asesores[$indice % count($asesores)]],
                    'Id_Linea' => $linea->Id,
                    'Id_PeriodoAca' => $periodo->Id,
                    'Inicio' => now()->subMonths($indice % 24)->format('Y-m-d'),
                    'Fin' => $indice % 3 === 0 ? null : now()->subMonths(max(0, ($indice % 24) - 1))->format('Y-m-d'),
                    'Estado' => $estados[$indice % count($estados)],
                    'Ganador' => $indice % 10 === 0,
                    'hidden' => $indice < 50,
                ]
            );

            $creados[] = $proyecto->Id;
        }

        $this->command->info('Proyectos procesados: ' . count($creados));
        $this->command->info('hidden=true: ' . Proyecto::whereIn('Id', $creados)->where('hidden', true)->count());
        $this->command->info('hidden=false: ' . Proyecto::whereIn('Id', $creados)->where('hidden', false)->count());
        $this->command->info('Líneas diferentes: ' . Proyecto::whereIn('Id', $creados)->distinct('Id_Linea')->count('Id_Linea'));
        $this->command->info('Periodos diferentes: ' . Proyecto::whereIn('Id', $creados)->distinct('Id_PeriodoAca')->count('Id_PeriodoAca'));
    }
}
