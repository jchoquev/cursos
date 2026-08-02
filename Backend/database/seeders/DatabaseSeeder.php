<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Asegurarse de que el periodo académico 2026-I esté creado y activo
        $periodo = \App\Models\PeriodoAca::firstOrCreate(
            ['Asig' => '2026-I'],
            ['Id' => \Illuminate\Support\Str::uuid()->toString(), 'Activo' => true]
        );
        \App\Models\TipoAsistente::firstOrCreate(['id' => 1], ['AsigTipo' => 'ASISTENTE']);
        \App\Models\TipoAsistente::firstOrCreate(['id' => 2], ['AsigTipo' => 'PONENTE']);
        \App\Models\TipoAsistente::firstOrCreate(['id' => 3], ['AsigTipo' => 'ORGANIZADOR']);

        User::firstOrCreate(['email' => 'admin@institucion.edu'], [
            'name' => 'Director General Ing. Francisco Carranza',
            'dni' => '00000001',
            'role' => 'Administrador',
            'password' => \Illuminate\Support\Facades\Hash::make('admin123'),
        ]);

        User::firstOrCreate(['email' => 'caja@institucion.edu'], [
            'name' => 'Lic. Sofía Alva (Tesorera)',
            'dni' => '00000002',
            'role' => 'Caja',
            'password' => \Illuminate\Support\Facades\Hash::make('caja123'),
        ]);

        User::firstOrCreate(['email' => 'formacion@institucion.edu'], [
            'name' => 'Unidad de Formación Continua',
            'dni' => '00000003',
            'role' => 'Formación Continua',
            'password' => \Illuminate\Support\Facades\Hash::make('formacion123'),
        ]);

        User::firstOrCreate(['email' => 'investigacion@institucion.edu'], [
            'name' => 'Unidad de Investigación',
            'dni' => '00000004',
            'role' => 'Investigación',
            'password' => \Illuminate\Support\Facades\Hash::make('investigacion123'),
        ]);

        $this->call([
            DataInternaSeeder::class,
            PeriodoAcaSeeder::class,
            InvLineaSeeder::class,
            ProyectoSeeder::class,
            InvestigacionSeeder::class,
            MatriculaSeeder::class,
        ]);
    }
}
