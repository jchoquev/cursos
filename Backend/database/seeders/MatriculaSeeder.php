<?php

namespace Database\Seeders;

use App\Models\Matricula;
use App\Models\Evento;
use App\Models\EmitirDocumento;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MatriculaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Asegurarse de que existan eventos en la base de datos
        if (Evento::count() === 0) {
            $this->command->warn('No hay eventos en la base de datos para asociar las matrículas.');
            return;
        }

        $count = 50; // Número de matrículas a generar
        $this->command->info("Generando {$count} matrículas de prueba...");

        // Crear las matrículas utilizando el factory
        $matriculas = Matricula::factory()->count($count)->create();

        $documentosCreados = 0;

        foreach ($matriculas as $matricula) {
            if ($matricula->Pago) {
                // Generar Id_Documento siguiendo la lógica de MatriculaController
                $yearDigits = date('y');
                $characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                $randomChars = '';
                for ($i = 0; $i < 3; $i++) {
                    $randomChars .= $characters[random_int(0, strlen($characters) - 1)];
                }
                
                // Obtener los últimos 2 dígitos del DNI
                $dniDigits = str_pad(substr($matricula->DNI, -2), 2, '0', STR_PAD_LEFT);
                
                // Contar cuántos documentos emitidos existen para este evento
                $order = EmitirDocumento::whereHas('matricula', function ($query) use ($matricula) {
                    $query->where('evento_id', $matricula->evento_id);
                })->count() + 1;
                
                $orderDigits = str_pad($order, 3, '0', STR_PAD_LEFT);
                
                $idDocumento = $yearDigits . $randomChars . $dniDigits . $orderDigits;

                EmitirDocumento::create([
                    'Id_Documento' => $idDocumento,
                    'Id_Matricula' => $matricula->id,
                    'Estado' => $matricula->CertificadoGenerado,
                ]);

                // Mantener consistencia en el evento
                $evento = Evento::find($matricula->evento_id);
                if ($evento) {
                    if ($evento->CapMaxima > 0) {
                        $evento->decrement('CapMaxima');
                    }
                    $evento->increment('NumMatriculados');
                }

                $documentosCreados++;
            }
        }

        $this->command->info("Se crearon {$count} matrículas de forma exitosa.");
        $this->command->info("Se generaron {$documentosCreados} documentos emitidos asociados a las matrículas pagadas.");
    }
}
