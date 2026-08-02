<?php

namespace Database\Seeders;

use App\Models\DataInterna;
use Faker\Factory as FakerFactory;
use Illuminate\Database\Seeder;

class DataInternaSeeder extends Seeder
{
    /**
     * Genera registros de prueba para la tabla DataInterna.
     */
    public function run(): void
    {
        $faker = FakerFactory::create('es_PE');
        $faker->seed(20260609);

        $procedencias = [
            'Interno',
            'Externo',
            'Universidad Nacional de Moquegua',
            'Instituto de Educación Superior Tecnológico',
        ];

        $tiposAsistente = [
            'Estudiante',
            'Docente',
            'Administrativo',
            'Egresado',
            'Invitado',
        ];

        $grados = [
            'Estudiante',
            'Bachiller',
            'Licenciado',
            'Magíster',
            'Doctor',
        ];

        for ($index = 1; $index <= 100; $index++) {
            $nombres = $faker->firstName();
            $apellidoPaterno = $faker->lastName();
            $apellidoMaterno = $faker->lastName();
            $dni = str_pad((string) (70000000 + $index), 8, '0', STR_PAD_LEFT);

            DataInterna::updateOrCreate(
                ['DNI' => $dni],
                [
                    'Procedencia' => $procedencias[($index - 1) % count($procedencias)],
                    'TipoAsistente' => $tiposAsistente[($index - 1) % count($tiposAsistente)],
                    'Nombres' => $nombres,
                    'ApPaterno' => $apellidoPaterno,
                    'ApMaterno' => $apellidoMaterno,
                    'Grado' => $grados[($index - 1) % count($grados)],
                    'Correo' => strtolower($faker->unique()->userName . $index . '@ejemplo.edu.pe'),
                    'NumCelular' => '9' . str_pad((string) (10000000 + $index), 8, '0', STR_PAD_LEFT),
                ]
            );
        }

        $this->command->info('Se generaron 100 registros de prueba para DataInterna.');
    }
}
