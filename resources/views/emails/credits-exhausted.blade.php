@extends('emails.layouts.master')

@section('title', 'You\'ve run out of credits')
@section('icon', '🪫')
@section('heading', 'You\'re out of credits')
@section('subheading', 'You\'ve used all the credits on your plan.')

@section('content')
    <p style="margin: 0 0 14px; font-size: 16px; line-height: 1.65; color: #2b2f33;">
        Hi{{ $shopName ? ' ' . $shopName : '' }}, you've used all of your available credits, so new barcode,
        SKU and label tasks are paused for now.
    </p>

    @include('emails.partials.stats', [
        'stats' => [
            ['label' => 'Credits used', 'value' => number_format($creditsUsed), 'accent' => '#c2410c'],
            ['label' => 'Plan total', 'value' => number_format($creditsTotal), 'accent' => '#1a1d21'],
        ],
    ])

    @include('emails.partials.note', [
        'tone' => 'info',
        'text' => 'Upgrade your plan for more monthly credits, or wait for your credits to refresh on your next cycle.',
    ])

    @include('emails.partials.button', ['url' => config('app.url'), 'label' => 'Upgrade plan'])

    <p style="margin: 22px 0 0; font-size: 13px; line-height: 1.6; color: #6b7280; text-align: center;">
        Questions about credits? <a href="mailto:{{ config('mail.from.address') }}"
            style="color: #0b6b54; text-decoration: none; font-weight: 600;">Contact support</a> — we're happy to help.
    </p>
@endsection
