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
            'rating' => 'required|integer|min:1|max:5',
            'message' => 'nullable|string|max:1000',
        ]);

        $user = $request->user() ?? Auth::user();

        if (!$user) {
            Log::warning('Feedback Auth: Initial check failed, attempting fallback.', [
                'headers' => $request->headers->all(),
            ]);
            
            // Try to find user by shop domain if available in request (fallback)
            // 1. Check query param
            $shopDomain = $request->query('shop');
            
            // 2. Check Referer header if not in query
            if (!$shopDomain && $request->headers->has('referer')) {
                $referer = parse_url($request->headers->get('referer'));
                if (isset($referer['query'])) {
                    parse_str($referer['query'], $queryParams);
                    $shopDomain = $queryParams['shop'] ?? null;
                }
            }

            if ($shopDomain) {
                 $user = \App\Models\User::where('name', $shopDomain)->first();
            }
        }

        if (!$user) {
            Log::error('Feedback Auth Final Failure', ['extracted_domain' => $shopDomain ?? 'none']);
            return back()->withErrors('Authentication failed (User not found).');
        }

        $feedback = Feedback::create([
            'user_id' => $user->id,
            'rating' => $validated['rating'],
            'message' => $validated['message'] ?? null,
        ]);

        // Send email to support
        $supportEmail = config('mail.from.address'); 
        
        try {
            Mail::to($supportEmail)->send(new FeedbackReceived($feedback));
        } catch (\Exception $e) {
            Log::error('Failed to send feedback email: ' . $e->getMessage());
        }

        return redirect()->back()->with('success', 'Thank you for your feedback!');
    }
}
