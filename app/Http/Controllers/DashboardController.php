<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Inertia\Inertia;
use App\Models\Appointment;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index()
    {
        $now   = now();
        $today = $now->toDateString();

        // Get all today's appointments (one query)
        $appointments = Appointment::whereDate('start_time', $today)
            ->orderBy('start_time')
            ->get();

        // Current in-progress appointment
        $inProgress = $appointments->firstWhere('status', 'in_progress');

        // Next appointment (scheduled, after now)
        $nextAppointment = $appointments
            ->where('status', 'scheduled')
            ->where('start_time', '>', $now)
            ->sortBy('start_time')
            ->first();

        // Map for dashboard table
        $appointmentsData = $appointments->map(fn($a) => [
            'id'           => $a->id,
            'client_name'  => $a->client_name ?? "",
            'client_phone' => $a->client_phone ?? "",
            'service'      => $a->service,
            'start_time'   => $a->start_time->format('H:i'),
            'duration'     => $a->duration,
            'status'       => $a->status,
        ]);

        $allAppointments = Appointment::orderBy('start_time')->get();

        $calendarEvents = $allAppointments->map(function ($event) {
            return [
                'id' => (string) $event->id,
                'title' => ($event->client_name ?? 'Unknown') . ' - ' . $event->service,
                'start' => $event->start_time->format('Y-m-d\TH:i:s'),
                'end'   => $event->start_time->copy()->addMinutes($event->duration)->format('Y-m-d\TH:i:s'),
                'backgroundColor' => match ($event->status) {
                    'In Progress' => '#f59e0b', // amber
                    'Completed'   => '#6b7280', // gray
                    'Canceled'    => '#ef4444', // red
                    'Confirmed'   => '#10b981', // green
                    'Scheduled'   => '#3b82f6', // blue
                    default       => '#6b7280', // gray
                },
                'borderColor' => match ($event->status) {
                    'In Progress' => '#f59e0b',
                    'Completed'   => '#6b7280',
                    'Canceled'    => '#ef4444',
                    'Confirmed'   => '#10b981',
                    'Scheduled'   => '#3b82f6',
                    default       => '#6b7280',
                },
                'extendedProps' => [
                    'appointmentId' => $event->id,
                    'clientName'    => $event->client_name ?? 'Unknown',
                    'clientPhone'   => $event->client_phone ?? '',
                    'service'       => $event->service,
                    'status'        => $event->status,
                    'duration'      => (int) $event->duration,
                ],
            ];
        });

        return inertia('dashboard', [
            'appointments' => $appointmentsData,

            'inProgress' => $inProgress ? [
                'id'           => $inProgress->id,
                'client_name'  => $inProgress->client_name ?? "",
                'client_phone' => $inProgress->client_phone ?? "",
                'service'      => $inProgress->service,
                'start_time'   => $inProgress->start_time->format('H:i'),
                'duration'     => $inProgress->duration,
                'status'       => $inProgress->status,
            ] : null,

            'nextAppointment' => $nextAppointment ? [
                'id'           => $nextAppointment->id,
                'client_name'  => $nextAppointment->client_name ?? "",
                'client_phone' => $nextAppointment->client_phone ?? "",
                'service'      => $nextAppointment->service,
                'start_time'   => $nextAppointment->start_time->format('H:i'),
                'duration'     => $nextAppointment->duration,
                'status'       => $nextAppointment->status,
            ] : null,

            'countToday' => $appointments->count(),
            'countWeek'  => Appointment::whereBetween('start_time', [$now->startOfWeek(), $now->endOfWeek()])->count(),
            'countMonth' => Appointment::whereMonth('start_time', $now->month)->count(),

            'calendarEvents' => $calendarEvents,
        ]);
    }
}
