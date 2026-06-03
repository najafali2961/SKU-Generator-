@extends('emails.layouts.master')

@section('title', 'Your free credits have been updated')
@section('icon', '🎁')
@section('heading', 'Good news — more credits for you')
@section('subheading', 'We\'ve refreshed the free credits on your plan.')

@section('content')
    <p style="margin: 0 0 22px; font-size: 16px; line-height: 1.65; color: #2b2f33;">
        Hi{{ $shopName ? ' ' . $shopName : '' }}, we've updated the free monthly credits included with
        <strong>{{ config('app.name') }}</strong>. Here's what's now available on the free plan:
    </p>

    @include('emails.partials.stats', [
        'stats' => [
            ['label' => 'Free credits / month', 'value' => number_format($credits), 'accent' => '#008060'],
        ],
    ])

    @include('emails.partials.note', [
        'tone' => 'success',
        'text' => 'Use your credits to generate barcodes, build SKUs and print labels. They refresh with your monthly cycle.',
    ])

    @include('emails.partials.button', ['url' => ($appUrl ?? config('app.url')), 'label' => 'Start generating'])
@endsection
