<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEventoRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'titulo'        => 'required|string',
            'RBanner'       => 'required|image|max:5120',
            'descripcion'   => 'required|string',
            'HAcademica'    => 'required|integer|min:0',
            'InInscripcion' => 'required|date',
            'FnInscripcion' => 'required|date|after_or_equal:InInscripcion',
            'InCurso'       => 'required|date',
            'FnCurso'       => 'required|date|after_or_equal:InCurso',
            'TActividad'    => 'required|exists:tipo_actividades,id',
            'DonceteExp'    => 'required',
            'CapMaxima'     => 'required|integer|min:1',
            'Estado'        => 'required|boolean',
        ];
    }

    /**
     * Custom validation error messages.
     */
    public function messages(): array
    {
        return [
            'titulo.required'        => 'El título es obligatorio.',
            'RBanner.required'       => 'El banner es obligatorio.',
            'descripcion.required'   => 'La descripción es obligatoria.',
            'HAcademica.required'    => 'Las horas académicas son obligatorias.',
            'InInscripcion.required' => 'La fecha de inicio de inscripción es obligatoria.',
            'FnInscripcion.required' => 'La fecha de fin de inscripción es obligatoria.',
            'InCurso.required'       => 'La fecha de inicio del curso es obligatoria.',
            'FnCurso.required'       => 'La fecha de fin del curso es obligatoria.',
            'TActividad.required'    => 'El tipo de actividad es obligatorio.',
            'TActividad.exists'      => 'El tipo de actividad seleccionado no existe.',
            'DonceteExp.required'    => 'Los docentes expositores son obligatorios.',
            'CapMaxima.required'     => 'La capacidad máxima es obligatoria.',
            'Estado.required'        => 'El estado es obligatorio.',
        ];
    }
}
