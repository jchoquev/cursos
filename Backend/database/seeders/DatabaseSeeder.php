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
            $periodoActive = \App\Models\PeriodoAca::where('Activo', true)->first();
            $periodoId = $periodoActive ? $periodoActive->Id : null;

            \App\Models\Evento::create([
                'id' => \Illuminate\Support\Str::uuid()->toString(),
                'titulo' => 'Desarrollo Frontend con Angular Avanzado',
                'RBanner' => '',
                'descripcion' => 'Domina Angular Signals, Server-Side Rendering (SSR), standalone arc