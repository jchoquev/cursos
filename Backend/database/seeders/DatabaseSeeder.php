<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        \App\Models\TipoAsistente::firstOrCreate(['id' => 1], ['AsigTipo' => 'ASISTENTE']);
        \App\Models\TipoAsistente::firstOrCreate(['id' => 2], ['AsigTipo' => 'PONENTE']);
        \App\Models\TipoAsistente::firstOrCreate(['id' => 3], ['AsigTipo' => 'ORGANIZADOR']);

        User::create([
            'name' => 'Director General Ing. Francisco Carranza',
            'email' => 'admin@institucion.edu',
            'dni' => '00000001',
            'role' => 'Administrador',
            'password' => \Illuminate\Support\Facades\Hash::make('admin123'),
        ]);

        User::create([
            'name' => 'Lic. Sofía Alva (Tesorera)',
            'email' => 'caja@institucion.edu',
            'dni' => '00000002',
            'role' => 'Caja',
            'password' => \Illuminate\Support\Facades\Hash::make('caja123'),
        ]);

        User::create([
            'name' => 'Unidad de Formación Continua',
            'email' => 'formacion@institucion.edu',
            'dni' => '00000003',
            'role' => 'Formación Continua',
            'password' => \Illuminate\Support\Facades\Hash::make('formacion123'),
        ]);

        User::create([
            'name' => 'Unidad de Investigación',
            'email' => 'investigacion@institucion.edu',
            'dni' => '00000004',
            'role' => 'Investigación',
            'password' => \Illuminate\Support\Facades\Hash::make('investigacion123'),
        ]);

        if (\App\Models\Evento::count() === 0) {
            \App\Models\Evento::create([
                'id' => \Illuminate\Support\Str::uuid()->toString(),
                'titulo' => 'Desarrollo Frontend con Angular Avanzado',
                'RBanner' => '',
                'descripcion' => 'Domina Angular Signals, Server-Side Rendering (SSR), standalone architecture y optimizaciones.',
                'HAcademica' => 40,
                'InInscripcion' => now()->subDays(5),
                'FnInscripcion' => now()->addDays(5),
                'InCurso' => now()->addDays(6),
                'FnCurso' => now()->addDays(15),
                'TActividad' => 1,
                'DonceteExp' => ['Dr. Alejandro Benítez'],
                'CapMaxima' => 35,
                'Estado' => true,
            ]);

            \App\Models\Evento::create([
                'id' => \Illuminate\Support\Str::uuid()->toString(),
                'titulo' => 'Diseño de Interfaces Web Premium y UX/UI',
                'RBanner' => '',
                'descripcion' => 'Crea experiencias inmersivas aplicando glassmorphism, esquemas HSL sofisticados y micro-animaciones.',
                'HAcademica' => 20,
                'InInscripcion' => now()->subDays(3),
                'FnInscripcion' => now()->addDays(7),
                'InCurso' => now()->addDays(8),
                'FnCurso' => now()->addDays(12),
                'TActividad' => 2,
                'DonceteExp' => ['MSc. Elena Rostova'],
                'CapMaxima' => 25,
                'Estado' => true,
            ]);

            \App\Models\Evento::create([
                'id' => \Illuminate\Support\Str::uuid()->toString(),
                'titulo' => 'Seminario de Seguridad y Criptografía Aplicada',
                'RBanner' => '',
                'descripcion' => 'Análisis de protocolos modernos de seguridad, blockchain y firmas criptográficas en entornos corporativos.',
                'HAcademica' => 15,
                'InInscripcion' => now()->subDays(10),
                'FnInscripcion' => now()->addDays(2),
                'InCurso' => now()->addDays(3),
                'FnCurso' => now()->addDays(5),
                'TActividad' => 3,
                'DonceteExp' => ['Ing. Carlos Mendoza'],
                'CapMaxima' => 50,
                'Estado' => true,
            ]);
        }
    }
}
