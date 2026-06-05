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
    }
}
