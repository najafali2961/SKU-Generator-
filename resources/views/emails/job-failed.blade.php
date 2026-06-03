@extends('emails.layouts.master')

@section('title', 'Your job didn\'t finish')
@section('icon', '⚠️')
@section('heading', $jobTitle . ' — needs attention')
@section('subheading', 'This task ran into a problem.')

@section('content')
    <p style="margin: 0 0 14px; font-size: 16px; line-height: 1.65; color: #2b2f33;">
        Hi{{ $shopName ? ' ' . $shopName : '' }}, unfortunately your <strong>{{ $jobTitle }}</strong> task
        stopped before it could finish. No need to worry — nothing was charged for the items that didn't process.
    </p>

    @if ($processed)
        @include('emails.partials.stats', [
            'stats' => [
                ['label' => 'Processed', 'value' => number_format($processed), 'accent' => '#008060'],
                ['label' => 'Not processed', 'value' => number_format($failed ?: 0), 'accent' => '#c2410c'],
            ],
        ])
    @endif

    @include('emails.partials.note', [
        'tone' => 'warning',
        'text' => $error ? ('What happened: ' . $error) : 'An unexpected error interrupted the task. Please try running it again.',
    ])

    <p style="margin: 0 0 26px; font-size: 14px; line-height: 1.6; color: #44474a;">
        You can re-run the task from the app. If it keeps happening, reply to this email or contact support and
        we'll jump in to help.
    </p>

    @include('emails.partials.button', ['url' => ($appUrl ?? config('app.url')), 'label' => 'Retry in the app'])
@endsection
