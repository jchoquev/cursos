<?php

namespace Database\Seeders;

use App\Models\InvLinea;
use App\Models\Proyecto;
use Illuminate\Database\Seeder;

class ProyectoSeeder extends Seeder
{
    public function run(): void
    {
        $linea1 = InvLinea::where('Linea', 'like', '%Inteligencia Artificial%')->first();
        $linea2 = InvLinea::where('Linea', 'like', '%Desarrollo de Software%')->first();

        if (!$linea1 || !$linea2) {
            $this->command->warn('No se encontraron líneas de investigación. Ejecuta primero InvLineaSeeder.');
            return;
        }

        $proyectos = [
            [
                'Titulo'      => 'Implementación de un Sistema de Monitoreo Agrícola Automatizado con IoT para Cultivos en la Región de Chojata',
                'Resumen'     => 'Proyecto de investigación aplicada enfocado en el diseño e implementación de una red de sensores IoT (humedad, temperatura, radiación) de bajo costo para optimizar el riego de cultivos de alfalfa y frutales en la sierra de Moquegua.',
                'Responsable' => ['Juan Choque Quispe', 'Wilber Mamani Flores'],
                'Asesor'      => ['Ing. Francisco Carranza'],
                'Id_Linea'    => $linea1->Id,
                'Inicio'      => '2025-03-12',
                'Fin'         => null,
                'Estado'      => 'En Ejecución',
                'Ganador'     => false,
            ],
            [
                'Titulo'      => 'Optimización de Procesos de Selección de Personal en Pymes de la Provincia de Sánchez Cerro mediante Algoritmos Genéticos',
                'Resumen'     => 'Esta investigación propone un modelo inteligente para automatizar y filtrar perfiles profesionales según competencias clave utilizando algoritmos bio-inspirados.',
                'Responsable' => ['Sofía Cárdenas Medina', 'Luis Peralta Vega'],
                'Asesor'      => ['Ing. Gustavo Alarcón'],
                'Id_Linea'    => $linea1->Id,
                'Inicio'      => '2024-10-05',
                'Fin'         => '2025-02-15',
                'Estado'      => 'Concluido',
                'Ganador'     => true,
            ],
            [
                'Titulo'      => 'Sistema de Gestión de Aprendizaje Adaptativo para Instituciones Educativas Rurales de la Región Moquegua',
                'Resumen'     => 'Desarrollo de una plataforma LMS con algoritmos de personalización que adaptan los contenidos educativos al ritmo de aprendizaje de cada estudiante, con especial enfoque en zonas con conectividad limitada.',
                'Responsable' => ['María Elena Quispe Torres', 'Carlos Huanca Layme'],
                'Asesor'      => ['Ing. Francisco Carranza'],
                'Id_Linea'    => $linea2->Id,
                'Inicio'      => '2025-04-01',
                'Fin'         => null,
                'Estado'      => 'En Ejecución',
                'Ganador'     => false,
            ],
            [
                'Titulo'      => 'Diseño de un Sistema de Alerta Temprana para Riesgos de Deslizamientos en la Provincia General Sánchez Cerro',
                'Resumen'     => 'Investigación orientada al desarrollo de un modelo predictivo basado en redes neuronales y datos geoespaciales para anticipar deslizamientos de tierra en zonas de alta vulnerabilidad en la sierra de Moquegua.',
                'Responsable' => ['Pedro Ramos Condori'],
                'Asesor'      => ['Ing. Francisco Carranza', 'Ing. Gustavo Alarcón'],
                'Id_Linea'    => $linea1->Id,
                'Inicio'      => '2025-07-01',
                'Fin'         => null,
                'Estado'      => 'En Ejecución',
                'Ganador'     => false,
            ],
            [
                'Titulo'      => 'Plataforma Web para la Digitalización del Registro de Trámites Municipales en el Distrito de Ubinas',
                'Resumen'     => 'Desarrollo e implementación de un sistema web progresivo (PWA) para la gestión documental y seguimiento de trámites en la municipalidad distrital de Ubinas, reduciendo tiempos de atención y promoviendo la transparencia administrativa.',
                'Responsable' => ['Rodrigo Velásquez Apaza', 'Ana Lucía Turpo Huanca'],
                'Asesor'      => ['Ing. Francisco Carranza'],
                'Id_Linea'    => $linea2->Id,
                'Inicio'      => '2024-08-15',
                'Fin'         => '2025-01-30',
                'Estado'      => 'Concluido',
                'Ganador'     => true,
            ],
        ];

        foreach ($proyectos as $data) {
            // Evitar duplicados por título
            if (!Proyecto::where('Titulo', $data['Titulo'])->exists()) {
                Proyecto::create($data);
            }
        }
    }
}
