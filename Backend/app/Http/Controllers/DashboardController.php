<?php

namespace App\Http\Controllers;

use App\Models\EmitirDocumento;
use App\Models\Evento;
use App\Models\Matricula;
use App\Models\PeriodoAca;
use App\Models\Proyecto;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function stats(Request $request): JsonResponse
    {
        $periodo = $request->filled('periodo_id')
            ? PeriodoAca::find($request->query('periodo_id'))
            : PeriodoAca::where('Activo', true)->first();

        $periodId = $periodo?->Id;
        $eventsQuery = Evento::with('tipoActividad')->when($periodId, fn ($q) => $q->where('Id_PeriodoAca', $periodId));
        $events = $eventsQuery->get();

        $registrations = Matricula::with(['evento.tipoActividad', 'tipoAsistenteRel', 'documento'])
            ->when($periodId, fn ($q) => $q->whereHas('evento', fn ($eventQuery) => $eventQuery->where('Id_PeriodoAca', $periodId)))
            ->get();

        $projects = Proyecto::with(['periodoAca', 'linea'])
            ->when($periodId, fn ($q) => $q->where('Id_PeriodoAca', $periodId))
            ->get();

        $validatedPayments = $registrations->where('Pago', true);
        $revenue = $validatedPayments->sum(function (Matricula $registration): float {
            return (float) data_get($registration->DatoPago, 'MontoPago', 0);
        });

        $certificates = EmitirDocumento::where('Estado', true)
            ->whereHas('matricula.evento', function ($query) use ($periodId): void {
                if ($periodId) $query->where('Id_PeriodoAca', $periodId);
            })
            ->count();

        $eventTypes = $events->groupBy(fn ($event) => $event->tipoActividad?->tipActividad ?: 'Sin tipo')
            ->map(fn ($items, $label) => ['label' => $label, 'value' => $items->count()])
            ->values();

        $projectStates = $projects->groupBy(fn ($project) => $project->Estado ?: 'Sin estado')
            ->map(fn ($items, $label) => ['label' => $label, 'value' => $items->count()])
            ->values();

        $paymentStates = collect([
            ['label' => 'Validados', 'value' => $validatedPayments->count()],
            ['label' => 'Pendientes', 'value' => $registrations->where('Pago', false)->count()],
        ]);

        $recentRegistrations = $registrations->sortByDesc('created_at')->take(6)->map(function (Matricula $registration): array {
            return [
                'id' => $registration->id,
                'name' => trim("{$registration->Nombres} {$registration->ApPaterno} {$registration->ApMaterno}"),
                'event' => $registration->evento?->titulo ?: 'Evento académico',
                'type' => $registration->tipoAsistenteRel?->AsigTipo ?: 'ASISTENTE',
                'paid' => (bool) $registration->Pago,
                'date' => optional($registration->created_at)->format('d/m/Y'),
            ];
        })->values();

        $recentProjects = $projects->sortByDesc('created_at')->take(6)->map(function (Proyecto $project): array {
            return [
                'id' => $project->Id,
                'title' => $project->Titulo,
                'state' => $project->Estado,
                'published' => !$project->hidden,
                'period' => $project->periodoAca?->Asig,
            ];
        })->values();

        return response()->json([
            'role' => $request->user()?->role,
            'period' => $periodo ? ['id' => $periodo->Id, 'name' => $periodo->Asig] : null,
            'summary' => [
                'users' => User::count(),
                'events' => $events->count(),
                'active_events' => $events->where('Estado', true)->count(),
                'registrations' => $registrations->count(),
                'pending_payments' => $registrations->where('Pago', false)->count(),
                'validated_payments' => $validatedPayments->count(),
                'revenue' => round($revenue, 2),
                'certificates' => $certificates,
                'projects' => $projects->count(),
                'published_projects' => $projects->where('hidden', false)->count(),
                'hidden_projects' => $projects->where('hidden', true)->count(),
                'projects_in_progress' => $projects->whereIn('Estado', ['En Ejecución', 'En Proceso'])->count(),
                'completed_projects' => $projects->where('Estado', 'Concluido')->count(),
            ],
            'charts' => [
                'event_types' => $eventTypes,
                'project_states' => $projectStates,
                'payment_states' => $paymentStates,
            ],
            'recent' => [
                'registrations' => $recentRegistrations,
                'projects' => $recentProjects,
            ],
        ]);
    }
}
