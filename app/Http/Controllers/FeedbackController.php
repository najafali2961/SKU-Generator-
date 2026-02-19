<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Feedback;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use App\Mail\FeedbackReceived;
use Illuminate\Support\Facades\Log;

class FeedbackController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'message' => 'required|string|max:1000',
        ]);

        $feedback = Feedback::create([
            'user_id' => Auth::id(),
            'message' => $validated['message'],
        ]);

        // Send email to support
        $supportEmail = config('mail.from.address'); // Or a specific support email env var
        
        try {
            Mail::to($supportEmail)->send(new FeedbackReceived($feedback));
        } catch (\Exception $e) {
            Log::error('Failed to send feedback email: ' . $e->getMessage());
        }

        return redirect()->back()->with('success', 'Thank you for your feedback!');
    }
}
