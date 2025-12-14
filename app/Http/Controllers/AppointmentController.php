<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Inertia\Inertia;
use App\Models\Appointment;
use Illuminate\Http\Request;
use function Pest\Laravel\json;
use Spatie\GoogleCalendar\Event;
use Illuminate\Support\Facades\Log;
use App\Services\EventParserService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Validator;
use function PHPUnit\Framework\returnSelf;
use Spatie\GoogleCalendar\Event as GoogleEvent;
use Google\Service\Exception as GoogleServiceException;

class AppointmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Appointment::latest();

        // Search functionality
        if ($request->filled('q')) {
            $searchTerm = $request->q;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('service', 'LIKE', "%{$searchTerm}%")
                    ->orWhere('notes', 'LIKE', "%{$searchTerm}%")
                    ->orWhere('status', 'LIKE', "%{$searchTerm}%")
                    ->orWhere('client_name', 'LIKE', "%{$searchTerm}%")
                    ->orWhere('client_phone', 'LIKE', "%{$searchTerm}%");
            });
        }

        // Date range filter
        if ($request->filled('date_from')) {
            $query->whereDate('start_time', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('start_time', '<=', $request->date_to);
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Service filter
        if ($request->filled('service')) {
            $query->where('service', 'LIKE', "%{$request->service}%");
        }

        // Attendance status filter
        if ($request->filled('attendance_status')) {
            $query->where('attendance_status', $request->attendance_status);
        }

        $appointments = $query->orderByDesc('created_at')->paginate(10);

        // Keep search parameters in pagination links
        $appointments->appends($request->only(['q', 'date_from', 'date_to', 'status', 'service', 'attendance_status']));

        return Inertia::render('appointment/index', [
            'appointments' => $appointments,
            'filters' => [
                'q' => $request->q,
                'date_from' => $request->date_from,
                'date_to' => $request->date_to,
                'status' => $request->status,
                'service' => $request->service,
                'attendance_status' => $request->attendance_status,
            ],
        ]);
    }


    public function events()
    {
        try {
            $syncResults = [
                'created' => 0,
                'updated' => 0,
                'errors' => []
            ];

            // ---- Fetch Google Calendar Events ----
            try {
                $calendarService = new \App\Services\GoogleCalendarService();

                if (!$calendarService->isConfigured()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Google Calendar credentials not found.',
                        'results' => $syncResults
                    ]);
                }

                $result = $calendarService->getEvents();

                if ($result['success']) {
                    $googleEvents = collect($result['events'])->map(function ($event) {
                        return (object)[
                            'id' => $event->getId(),
                            'summary' => $event->getSummary(),
                            'startDateTime' => $event->getStart()->getDateTime() ?: $event->getStart()->getDate(),
                            'endDateTime' => $event->getEnd()->getDateTime() ?: $event->getEnd()->getDate(),
                            'updated' => $event->getUpdated()
                        ];
                    });
                } else {
                    return response()->json([
                        'success' => false,
                        'message' => 'Failed to fetch events: ' . $result['error'],
                        'results' => $syncResults
                    ]);
                }
            } catch (\Exception $e) {
                $googleEvents = \Spatie\GoogleCalendar\Event::get();
            }

            if (empty($googleEvents) || $googleEvents->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No events found',
                    'results' => $syncResults
                ]);
            }

            // ---- Sync Google Events with Appointments ----
            foreach ($googleEvents as $event) {
                try {
                    // Format: "Client - Service - Phone"
                    $eventName = $event->summary ?? '';
                    $clientName = null;
                    $serviceName = $eventName;
                    $phone = null;

                    if (substr_count($eventName, ' - ') >= 2) {
                        $parts = explode(' - ', $eventName, 3);
                        $clientName = trim($parts[0]);
                        $serviceName = trim($parts[1]);
                        $phone = trim($parts[2]);
                    } elseif (strpos($eventName, ' - ') !== false) {
                        $parts = explode(' - ', $eventName, 2);
                        $clientName = trim($parts[0]);
                        $serviceName = trim($parts[1]);
                    }

                    $appointment = \App\Models\Appointment::where('event_id', $event->id)->first();

                    $startTime = $event->startDateTime ?? $event->start ?? null;
                    $endTime = $event->endDateTime ?? $event->end ?? null;

                    if (!$startTime) {
                        $syncResults['errors'][] = [
                            'event_id' => $event->id,
                            'error' => 'Missing start time'
                        ];
                        continue;
                    }

                    $start = \Carbon\Carbon::parse($startTime)->timezone(config('app.timezone'));
                    $end = $endTime ? \Carbon\Carbon::parse($endTime)->timezone(config('app.timezone')) : $start->copy()->addHour();
                    $duration = $start->diffInMinutes($end);

                    // ---- Create or Update Appointment ----
                    $data = [
                        'client_name' => $clientName,
                        'client_phone' => $phone,
                        'service' => $serviceName,
                        'start_time' => $start,
                        'duration' => $duration,
                        'status' => 'confirmed',
                        'attendance_status' => 'pending',
                        'event_id' => $event->id,
                    ];

                    if (!$appointment) {
                        \App\Models\Appointment::create($data);
                        $syncResults['created']++;
                    } else {
                        $appointment->update($data);
                        $syncResults['updated']++;
                    }
                } catch (\Exception $e) {
                    $syncResults['errors'][] = [
                        'event_id' => $event->id,
                        'error' => $e->getMessage()
                    ];
                }
            }

            return response()->json([
                'success' => empty($syncResults['errors']),
                'message' => empty($syncResults['errors'])
                    ? 'Calendar sync completed successfully'
                    : 'Sync completed with some errors',
                'results' => $syncResults
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sync failed: ' . $e->getMessage(),
                'results' => ['created' => 0, 'updated' => 0, 'errors' => [$e->getMessage()]]
            ]);
        }
    }

    public function create()
    {
        return Inertia::render('appointment/create');
    }

    public function store(Request $request)
    {
        $request->validate([
            'client_name'   => 'nullable|string',
            'client_phone'  => 'nullable|string',
            'service'       => 'required|in:Hair Cut,Beard Shaping,Other Services',
            'start_time'    => 'required|date',
            'duration'      => 'required|integer|min:5',
            'status'        => 'required|in:Scheduled,Confirmed,Canceled',
            'notes'         => 'nullable|string',
        ]);

        $start = Carbon::parse($request->start_time);
        $end = (clone $start)->addMinutes((int) $request->duration);

        // Create Google Calendar Event (format: "Name - Service - Phone")
        $eventTitle = trim($request->client_name . ' - ' . $request->service . ' - ' . $request->client_phone, ' -');
        $event = \Spatie\GoogleCalendar\Event::create([
            'name' => $eventTitle,
            'startDateTime' => $start,
            'endDateTime' => $end,
        ]);

        // Save appointment locally
        $appointment = new Appointment();
        $appointment->event_id      = $event->id;
        $appointment->client_name   = $request->client_name;
        $appointment->client_phone  = $request->client_phone;
        $appointment->service       = $request->service;
        $appointment->duration      = $request->duration;
        $appointment->start_time    = $start;
        $appointment->status        = $request->status;
        $appointment->notes         = $request->notes;
        $appointment->save();

        return redirect()->back()->with('success', 'Appointment created successfully!');
    }


    public function update(Request $request, Appointment $appointment)
    {
        $request->validate([
            'client_name'       => ['nullable', 'string', 'max:255'],
            'client_phone'      => ['required', 'string', 'max:20'],
            'service'           => ['required', 'string', 'max:255'],
            'duration'          => ['nullable', 'numeric', 'max:120'],
            'attendance_status' => ['nullable', 'string', 'max:50'],
            'start_time'        => ['required', 'date'],
            'status'            => ['required', 'string', 'max:50'],
            'reminder_sent'     => ['nullable', 'date'],
            'notes'             => ['nullable', 'string'],
            'event_id'          => ['nullable', 'string'],
        ]);

        // Update appointment record
        $appointment->update([
            'client_name'       => $request->client_name,
            'client_phone'      => $request->client_phone,
            'service'           => $request->service,
            'duration'          => $request->duration,
            'attendance_status' => $request->attendance_status,
            'start_time'        => $request->start_time,
            'status'            => $request->status,
            'reminder_sent'     => $request->reminder_sent,
            'notes'             => $request->notes,
            'event_id'          => $request->event_id,
        ]);

        // Update linked Google Calendar event (if exists)
        if ($appointment->event_id) {
            try {
                $event = \Spatie\GoogleCalendar\Event::find($appointment->event_id);

                if ($event) {
                    $eventTitle = trim($appointment->client_name . ' - ' . $appointment->service . ' - ' . $appointment->client_phone, ' -');
                    $start = Carbon::parse($appointment->start_time);
                    $duration = (int)($appointment->duration ?? 30);

                    $event->name = $eventTitle;
                    $event->startDateTime = $start;
                    $event->endDateTime = (clone $start)->addMinutes($duration);
                    $event->save();
                }
            } catch (\Exception $e) {
                Log::warning('Failed to update Google event', [
                    'event_id' => $appointment->event_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return back(303)->with('success', 'Appointment updated successfully.');
    }


    public function destroy(int $id): RedirectResponse
    {


        $appointment = Appointment::findOrFail($id);

        if ($appointment->event_id) {
            try {
                $googleEvent = Event::find($appointment->event_id);
                $googleEvent?->delete();
            } catch (GoogleServiceException $e) {
                // Ignore if Google says event doesn't exist anymore
                if (in_array($e->getCode(), [404, 410])) {
                    Log::info("Google event already deleted: {$appointment->event_id}");
                } else {
                    throw $e; // rethrow unexpected errors
                }
            } catch (\Exception $e) {
                // Log other exceptions, but don't block deletion
                Log::warning("Failed to delete Google event {$appointment->event_id}: {$e->getMessage()}");
            }
        }

        // Delete the appointment locally
        $appointment->delete();

        // If you’re using Inertia + Ziggy:
        return redirect()
            ->back()
            ->with('success', 'Appointment deleted successfully.');
    }

    public function updateTime(Request $request)
    {
        $request->validate([
            'id' => 'required|exists:appointments,id',
            'start_time' => 'required|date',
            'duration' => 'required|integer|min:1',
        ]);

        $appointment = Appointment::findOrFail($request->id);
        $appointment->start_time = $request->start_time;
        $appointment->duration = $request->duration;
        $appointment->save();

        return response()->json(['success' => true]);
    }
}
