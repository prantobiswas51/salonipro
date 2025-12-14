<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use App\Models\Appointment;
use App\Models\Whatsapp;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class SendWhatsAppMessage extends Command
{

    protected $signature = 'appointments:notify-tomorrow {--dry-run}';
    protected $description = 'Send WhatsApp reminders for tomorrow\'s scheduled appointments';

    public function handle()
    {
        $dryRun = (bool) $this->option('dry-run');

        // Define two reminder windows
        $windows = [
            '3_days' => [now()->addDays(3)->startOfDay(), now()->addDays(3)->endOfDay()],
            '1_day'  => [now()->addDay()->startOfDay(), now()->addDay()->endOfDay()],
        ];

        foreach ($windows as $label => [$start, $end]) {
            $this->info("📅 Scanning {$label} appointments from {$start} to {$end}" . ($dryRun ? ' [DRY RUN]' : ''));

            Appointment::whereBetween('start_time', [$start, $end])
                ->where('status', 'Scheduled')
                ->orderBy('id')
                ->chunkById(200, function ($appointments) use ($dryRun, $label) {
                    foreach ($appointments as $appointment) {
                        $to   = $appointment->client_phone;
                        $name = $appointment->client_name ?: 'Customer';

                        if (empty($to)) {
                            continue;
                        }

                        $time = $appointment->start_time
                            ? Carbon::parse($appointment->start_time)->timezone(config('app.timezone'))->format('h:i A')
                            : null;

                        // Fetch WhatsApp message template
                        $template = Whatsapp::first()?->message ?? 'Hello {$name}, your appointment is at {$time}.';

                        // Inject dynamic variables
                        $vars = [
                            'name' => $name,
                            'time' => $time,
                            'days' => $label === '3_days' ? '3 days' : '1 day',
                        ];

                        $message = preg_replace_callback('/\{\$(\w+)\}/', function ($matches) use ($vars) {
                            return $vars[$matches[1]] ?? $matches[0];
                        }, $template);

                        if ($dryRun) {
                            $this->line("🧪 DRY RUN → Would send to {$to}: \"{$message}\" ({$label} reminder)");
                            continue;
                        }

                        try {
                            $ok = $this->sendWhatsApp($to, $message, $name, $time);

                            if ($ok) {
                                $this->info("✅ {$label} reminder sent to {$name} ({$to}) for {$time}");
                            } else {
                                $this->error("❌ Failed to send {$label} reminder to {$name} ({$to})");
                            }
                        } catch (\Throwable $e) {
                            Log::error('WhatsApp send failed', [
                                'appointment_id' => $appointment->id,
                                'phone' => $to,
                                'error' => $e->getMessage(),
                            ]);
                            $this->error("⚠️ Exception sending to {$name} ({$to})");
                        }
                    }
                });
        }

        return self::SUCCESS;
    }


    private function sendWhatsApp(string $to, string $message, ?string $name = null, ?string $time = null): bool
    {
        $whatsapp = Whatsapp::first();

        if (!$whatsapp || !$whatsapp->token || !$whatsapp->number_id) {
            Log::error('WhatsApp credentials are missing.');
            return false;
        }

        $token         = $whatsapp->token;
        $phoneNumberId = $whatsapp->number_id;

        // Prepare dynamic parameters for the template
        $clientName      = $name ?? 'Customer';
        $appointmentTime = $time ?? '';

        // WhatsApp Cloud API endpoint
        $url = "https://graph.facebook.com/v23.0/{$phoneNumberId}/messages";

        // Prepare the WhatsApp template payload
        $payload = [
            'messaging_product' => 'whatsapp',
            'to'                => $to,
            'type'              => 'template',
            'template'          => [
                'name'     => 'appointment_reminder', // 👈 your template name
                'language' => ['code' => 'it'],       // adjust to your template language
                'components' => [
                    [
                        'type'       => 'body',
                        'parameters' => [
                            ['type' => 'text', 'text' => $clientName],
                            ['type' => 'text', 'text' => $appointmentTime],
                        ],
                    ],
                ],
            ],
        ];

        try {
            $resp = Http::withToken($token)
                ->acceptJson()
                ->withoutVerifying()
                ->post($url, $payload);

            if ($resp->successful()) {
                Log::info("WhatsApp message sent to {$to} ({$clientName})");
                return true;
            }

            $json = $resp->json();
            Log::warning('WhatsApp send failed', [
                'status' => $resp->status(),
                'body'   => $json,
                'to'     => $to,
            ]);

            if (method_exists($this, 'error')) {
                $reason = $json['error']['message'] ?? 'Unknown error';
                $code   = $json['error']['code']    ?? 'n/a';
                $this->error("WhatsApp send failed ({$code}): {$reason}");
            }

            return false;
        } catch (\Throwable $e) {
            Log::error('WhatsApp send exception', [
                'error' => $e->getMessage(),
                'to'    => $to,
            ]);
            if (method_exists($this, 'error')) {
                $this->error("WhatsApp send exception: {$e->getMessage()}");
            }
            return false;
        }
    }
}
