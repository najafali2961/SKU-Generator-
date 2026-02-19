<x-mail::message>
    # New Feedback Received

    **User:** {{ $feedback->user->name }} ({{ $feedback->user->email }})
    **Shop:** {{ $feedback->user->name }}

    **Message:**
    {{ $feedback->message }}

    Thanks,<br>
    {{ config('app.name') }}
</x-mail::message>
