<?php

namespace Database\Seeders;

use App\Models\InvLinea;
use App\Models\PeriodoAca;
use App\Models\Proyecto;
use Illuminate\Database\Seeder;

class ProyectoSeeder extends Seeder
{
    private const PROYECTOS_POR_PERIODO = 6;

    public function run(): void
    {
        $periodos = PeriodoAca::orderBy('Asig')->get();

        if ($periodos->isEmpty()) {
            $this->command->warn('No se encontraron periodos académicos. Ejecuta primero PeriodoAcaSeeder.');
            return;
        }

        $titulos = [
            'Plataforma de aprendizaje adaptativo para estudiantes de zonas rurales',
            'Sistema de analítica académica para detectar riesgo de deserción estudiantil',
            'Aplicación móvil para fortalecer competencias digitales',
            'Red IoT para monitoreo de cultivos y uso eficiente del agua',
            'Sistema inteligente de alerta temprana para comunidades vulnerables',
            'Modelo predictivo para optimizar procesos institucionales',
        ];

        foreach ($periodos as $periodo) {
            $lineas = $this->obtenerLineasDelPeriodo($periodo);
            $cantidadActual = Proyecto::where('Id_PeriodoAca', $periodo->Id)->count();

            for ($indice = $cantidadActual; $indice < self::PROYECTOS_POR_PERIODO; $indice++) {
                $titulo = "{$titulos[$indice]} - {$periodo->Asig}";

                Proyecto::firstOrCreate(
                    ['Titulo' => $titulo],
                    [
                        'Resumen' => "Proyecto de investigación aplicada correspondiente al periodo académico {$periodo->Asig}.",
                        'Responsable' => [$this->responsables[$indice % count($this->responsables)]],
                        'Asesor' => [$this->asesores[$indice % count($this->asesores)]],
                        'Id_Linea' => $lineas[$indice % count($lineas)]->Id,
                        'Id_PeriodoAca' => $periodo->Id,
                        'Inicio' => now()->subMonths(6 - $indice)->format('Y-m-d'),
                        'Fin' => $indice % 2 === 0 ? null : now()->subMonths(1)->format('Y-m-d'),
                        'Estado' => $indice % 2 === 0 ? 'En Ejecución' : 'Concluido',
                        'Ganador' => $indice === self::PROYECTOS_POR_PERIODO - 1,
                    ]
                );
            }

            $this->command->info("{$periodo->Asig}: " . Proyecto::where('Id_PeriodoAca', $periodo->Id)->count() . ' proyectos.');
        }
    }

    private array $responsables = [
        'Juan Choque Quispe',
        'María Elena Quispe Torres',
        'Carlos Huanca Layme',
        'Sofía Cárdenas Medina',
        'Luis Peralta Vega',
        'Rodrigo Velásquez Apaza',
    ];

    private array $asesores = [
        'Ing. Francisco Carranza',
        'Ing. Gustavo Alarcón',
    ];

    /**
     * Devuelve líneas pertenecientes al periodo y crea líneas base si faltan.
     * Esto evita asociar proyectos de un periodo con líneas de otro periodo.
     */
    private function obtenerLineasDelPeriodo(PeriodoAca $periodo): array
    {
        $lineas = InvLinea::where('Id_PeriodoAca', $periodo->Id)->get()->all();

        foreach (['Tecnologías Inteligentes e Innovación', 'Desarrollo de Software y Sistemas Aplicados'] as $nombre) {
            if (count($lineas) >= 2) {
                break;
            }

            $lineas[] = InvLinea::firstOrCreate([
                'Id_PeriodoAca' => $periodo->Id,
                'Linea' => "{$nombre} - {$periodo->Asig}",
            ]);
        }

        return $lineas;
    }
}
