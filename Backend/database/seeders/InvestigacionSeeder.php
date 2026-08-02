<?php

namespace Database\Seeders;

use App\Models\InvLinea;
use App\Models\PeriodoAca;
use App\Models\Proyecto;
use Illuminate\Database\Seeder;

class InvestigacionSeeder extends Seeder
{
    /**
     * Crea dos líneas de investigación y seis proyectos para cada una.
     * Los proyectos quedan relacionados al periodo a través de su línea.
     */
    public function run(): void
    {
        $periodo = PeriodoAca::where('Asig', '2026-I')->first()
            ?? PeriodoAca::where('Activo', true)->first();

        if (!$periodo) {
            $this->command->warn('No se encontró un periodo académico para las líneas de investigación.');
            return;
        }

        $lineas = [
            [
                'nombre' => 'Transformación Digital e Innovación Tecnológica para la Educación Rural',
                'proyectos' => [
                    'Plataforma de aprendizaje adaptativo para estudiantes de zonas rurales',
                    'Aula virtual offline para instituciones educativas con conectividad limitada',
                    'Sistema de analítica académica para detectar riesgo de deserción estudiantil',
                    'Aplicación móvil para fortalecer competencias digitales docentes',
                    'Laboratorio virtual de programación para educación secundaria',
                    'Modelo de evaluación automatizada para cursos técnicos',
                ],
            ],
            [
                'nombre' => 'Tecnologías Sostenibles y Sistemas Inteligentes para la Gestión Hídrica',
                'proyectos' => [
                    'Red IoT para monitoreo de humedad en cultivos de la provincia Sánchez Cerro',
                    'Sistema inteligente de alerta temprana para heladas en zonas altoandinas',
                    'Modelo predictivo para optimizar el uso de agua en parcelas agrícolas',
                    'Plataforma geoespacial para identificar fuentes de agua en comunidades rurales',
                    'Diseño de sensores de bajo costo para controlar la calidad del agua',
                    'Sistema solar automatizado para bombeo y distribución de agua agrícola',
                ],
            ],
        ];

        foreach ($lineas as $lineaData) {
            $linea = InvLinea::firstOrCreate(
                ['Linea' => $lineaData['nombre']],
                ['Id_PeriodoAca' => $periodo->Id]
            );

            foreach ($lineaData['proyectos'] as $indice => $titulo) {
                Proyecto::firstOrCreate(
                    ['Titulo' => $titulo],
                    [
                        'Resumen' => "Investigación aplicada de la línea {$linea->Linea}, vinculada al periodo académico {$periodo->Asig}.",
                        'Responsable' => [
                            ['Juan Choque Quispe', 'María Elena Quispe Torres', 'Carlos Huanca Layme'][$indice % 3],
                        ],
                        'Asesor' => ['Ing. Francisco Carranza'],
                        'Id_Linea' => $linea->Id,
                        'Id_PeriodoAca' => $periodo->Id,
                        'Inicio' => now()->subMonths(6 + $indice)->format('Y-m-d'),
                        'Fin' => $indice % 2 === 0 ? null : now()->subMonths(1)->format('Y-m-d'),
                        'Estado' => $indice % 2 === 0 ? 'En Ejecución' : 'Concluido',
                        'Ganador' => $indice === 5,
                    ]
                );
            }
        }

        $this->command->info('Se crearon 2 líneas de investigación con 6 proyectos cada una.');
    }
}
