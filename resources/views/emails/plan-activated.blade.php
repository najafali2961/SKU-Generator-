@extends('emails.layouts.master')

@section('title', 'Your plan is active')
@section('icon', '🚀')
@section('heading', $planName . ' is live!')
@section('subheading', 'Thanks for upgrading — your new plan is active.')

@section('content')
    <p style="margin: 0 0 22px; font-size: 16px; line-height: 1.65; color: #2b2f33;">
        Hi{{ $shopName ? ' ' . $shopName : '' }}, your subscription to the <strong>{{ $planName }}</strong> plan
        on {{ config('app.name') }} is now active. Here's what you've unlocked:
    </p>

    @include('emails.partials.stats', [
        'stats' => [
            ['label' => 'Plan', 'value' => $planName, 'accent' => '#1a1d21'],
            $unlimited
                ? ['label' => 'Credits', 'value' => '∞', 'accent' => '#008060']
                : ['label' => 'Monthly credits', 'value' => number_format($credits ?? 0), 'accent' => '#008060'],
        ],
    ])

    @include('emails.partials.note', [
        'tone' => 'success',
        'text' => $unlimited
            ? 'You now have unlimited credits. Generate barcodes, SKUs and labels without limits.'
            : 'Your credits have been topped up and your monthly cycle has been reset. You\'re all set!',
    ])

    @include('emails.partials.button', ['url' => ($appUrl ?? config('app.url')), 'label' => 'Start using your plan'])
@endsection
