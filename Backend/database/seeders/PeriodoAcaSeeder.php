<?php

namespace Database\Seeders;

use App\Models\Evento;
use App\Models\PeriodoAca;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class PeriodoAcaSeeder extends Seeder
{
    /**
     * Crea cinco periodos académicos con cuatro cursos cada uno.
     */
    public function run(): void
    {
        $periodos = [
            '2024-I' => [
                'Fundamentos de Programación',
                'Matemática Aplicada a la Tecnología',
                'Comunicación Profesional',
                'Introducción a las Redes de Computadoras',
            ],
            '2024-II' => [
                'Programación Orientada a Objetos',
                'Base de Datos I',
                'Diseño Gráfico Digital',
                'Sistemas Operativos',
            ],
            '2025-I' => [
                'Desarrollo Web Frontend',
                'Base de Datos II',
                'Análisis y Diseño de Sistemas',
                'Emprendimiento y Gestión Empresarial',
            ],
            '2025-II' => [
                'Desarrollo de Aplicaciones Móviles',
                'Seguridad Informática',
                'Ingeniería de Software',
                'Administración de Servidores',
            ],
            '2026-I' => [
                'Desarrollo Frontend con Angular Avanzado',
                'Diseño de Interfaces Web Premium y UX/UI',
                'Seminario de Seguridad y Criptografía Aplicada',
                'Inteligencia Artificial Aplicada al Desarrollo de Software',
            ],
        ];

        foreach ($periodos as $numero => $cursos) {
            $periodo = PeriodoAca::firstOrCreate(
                ['Asig' => $numero],
                ['Id' => Str::uuid()->toString(), 'Activo' => $numero === '2026-I']
            );

            foreach ($cursos as $indice => $titulo) {
                $inicioCurso = now()->subMonths((4 - array_search($numero, array_keys($periodos))) * 6);

                Evento::firstOrCreate(
                    ['titulo' => $titulo],
                    [
                        'id' => Str::uuid()->toString(),
                        'RBanner' => '',
                        'descripcion' => "Curso de {$titulo}, orientado al desarrollo de competencias profesionales y técnicas.",
                        'HAcademica' => [40, 32, 24, 20][$indice],
                        'InInscripcion' => $inicioCurso->copy()->subDays(15),
                        'FnInscripcion' => $inicioCurso->copy()->subDays(2),
                        'InCurso' => $inicioCurso->copy(),
                        'FnCurso' => $inicioCurso->copy()->addDays(45),
                        'TActividad' => ($indice % 3) + 1,
                        'DonceteExp' => ['Docente de ' . $titulo],
                        'CapMaxima' => 30 + ($indice * 5),
                        'Estado' => true,
                        'Id_PeriodoAca' => $periodo->Id,
                    ]
                );
            }
        }

        $this->command->info('Se crearon 5 periodos académicos con 4 cursos cada uno.');
    }
}
