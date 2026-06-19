<?php

namespace Database\Factories;

use App\Models\Matricula;
use App\Models\Evento;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Matricula>
 */
class MatriculaFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Matricula::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $pago = fake()->boolean(60); // 60% chance of being paid

        return [
            'DNI' => fake()->unique()->numerify('########'),
            'Procedencia' => fake()->randomElement(['IESTP Chojata', 'Moquegua', 'Lima', 'Arequipa', 'Tacna', 'Externo']),
            'TipoAsistente' => fake()->randomElement([1, 2, 3]), // 1: ASISTENTE, 2: PONENTE, 3: ORGANIZADOR
            'Nombres' => fake()->firstName(),
            'ApPaterno' => fake()->lastName(),
            'ApMaterno' => fake()->lastName(),
            'GradAcademico' => fake()->randomElement(['Bachiller', 'Magíster', 'Doctor', 'Ingeniero', 'Licenciado', 'Estudiante']),
            'Correo' => fake()->unique()->safeEmail(),
            'NumCelular' => fake()->numerify('9########'),
            'Pago' => $pago,
            'DatoPago' => $pago ? [
                'NumRecibo' => fake()->numerify('REC-#####'),
                'FechaPago' => fake()->date('Y-m-d'),
                'MontoPago' => fake()->randomElement([50.00, 100.00, 150.00, 200.00]),
            ] : [],
            'CertificadoGenerado' => $pago ? fake()->boolean(40) : false,
            'evento_id' => Evento::inRandomOrder()->first()?->id ?? Str::uuid()->toString(),
        ];
    }
}
