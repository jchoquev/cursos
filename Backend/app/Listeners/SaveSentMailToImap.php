<?php

namespace App\Listeners;

use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\Log;

class SaveSentMailToImap
{
    /**
     * Handle the event.
     */
    public function handle(MessageSent $event): void
    {
        Log::info("SaveSentMailToImap: Listener triggered for email subject: " . $event->message->getSubject());
        try {
            $host = 'ssl://' . env('MAIL_HOST');
            $port = 993;
            $user = env('MAIL_USERNAME');
            $pass = env('MAIL_PASSWORD');

            if (!$host || !$user || !$pass) {
                return;
            }

            // Connect to IMAP server
            $socket = @fsockopen($host, $port, $errno, $errstr, 10);
            if (!$socket) {
                Log::error("IMAP connection failed for Sent folder sync: $errstr ($errno)");
                return;
            }

            fgets($socket); // read welcome message

            // Log in
            fwrite($socket, "A1 LOGIN $user $pass\r\n");
            $loginRes = $this->readResponse($socket, 'A1');

            if (strpos($loginRes, 'A1 OK') === false) {
                Log::error("IMAP login failed during Sent folder sync for $user: $loginRes");
                fclose($socket);
                return;
            }

            // Get the raw email MIME message
            $rawEmail = $event->message->toString();
            $len = strlen($rawEmail);

            // Append the email message to the INBOX.Sent folder
            fwrite($socket, "A2 APPEND INBOX.Sent (\\Seen) {" . $len . "}\r\n");
            fgets($socket); // read the server prompt (typically "+ OK")

            // Send the raw mail contents
            fwrite($socket, $rawEmail . "\r\n");
            $appendRes = $this->readResponse($socket, 'A2');

            if (strpos($appendRes, 'A2 OK') === false) {
                Log::error("IMAP append failed during Sent folder sync: $appendRes");
            }

            // Log out
            fwrite($socket, "A3 LOGOUT\r\n");
            fclose($socket);
        } catch (\Exception $e) {
            Log::error("Error syncing sent mail to IMAP folder: " . $e->getMessage());
        }
    }

    /**
     * Read the server response until the tagged response is reached.
     */
    private function readResponse($socket, string $tag): string
    {
        $response = '';
        while ($line = fgets($socket)) {
            $response .= $line;
            if (preg_match('/^' . $tag . '\s+(OK|NO|BAD)/i', $line)) {
                break;
            }
        }
        return $response;
    }
}
