@extends('emails.layouts.master')

@section('title', 'Your free trial has started')
@section('icon', '🎈')
@section('heading', 'Your free trial has started')
@section('subheading', $trialDays . ' days of ' . $planName . ', on us.')

@section('content')
    <p style="margin: 0 0 22px; font-size: 16px; line-height: 1.65; color: #2b2f33;">
        Hi{{ $shopName ? ' ' . $shopName : '' }}, your free trial of the <strong>{{ $planName }}</strong> plan
        is now active. Explore everything {{ config('app.name') }} has to offer — you won't be charged until your
        trial ends.
    </p>

    @include('emails.partials.stats', [
        'stats' => array_values(array_filter([
            ['label' => 'Trial length', 'value' => $trialDays . ' days', 'accent' => '#008060'],
            $trialEndsAt ? ['label' => 'Renews on', 'value' => $trialEndsAt, 'accent' => '#1a1d21'] : null,
        ])),
    ])

    @include('emails.partials.note', [
        'tone' => 'info',
        'text' => 'No charge during your trial. You can cancel anytime before it ends and you won\'t be billed.',
    ])

    @include('emails.partials.button', ['url' => ($appUrl ?? config('app.url')), 'label' => 'Explore the app'])
@endsection
