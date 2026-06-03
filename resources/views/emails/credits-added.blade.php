@extends('emails.layouts.master')

@php
    $copy = match ($type) {
        'giveaway' => [
            'icon' => '🎁',
            'heading' => 'You\'ve got bonus credits!',
            'sub' => 'A little gift has landed in your account.',
            'intro' => 'Great news — we\'ve added some bonus credits to your ' . config('app.name') . ' account as a thank you.',
        ],
        'reset' => [
            'icon' => '🔄',
            'heading' => 'Your credits have refreshed',
            'sub' => 'A fresh batch of credits for the new cycle.',
            'intro' => 'Your monthly credits on ' . config('app.name') . ' have just been refreshed for the new billing cycle.',
        ],
        default => [
            'icon' => '➕',
            'heading' => 'Credits added',
            'sub' => 'Your balance just went up.',
            'intro' => 'We\'ve added credits to your ' . config('app.name') . ' account.',
        ],
    };
@endphp

@section('title', $copy['heading'])
@section('icon', $copy['icon'])
@section('heading', $copy['heading'])
@section('subheading', $copy['sub'])

@section('content')
    <p style="margin: 0 0 22px; font-size: 16px; line-height: 1.65; color: #2b2f33;">
        Hi{{ $shopName ? ' ' . $shopName : '' }}, {{ $copy['intro'] }}
    </p>

    @include('emails.partials.stats', [
        'stats' => array_values(array_filter([
            $amount ? ['label' => 'Credits added', 'value' => '+' . number_format($amount), 'accent' => '#16a34a'] : null,
            ['label' => 'New balance', 'value' => number_format($newBalance), 'accent' => '#008060'],
        ])),
    ])

    @include('emails.partials.note', [
        'tone' => 'success',
        'text' => 'Put them to work — generate barcodes, build SKUs and print labels right away.',
    ])

    @include('emails.partials.button', ['url' => ($appUrl ?? config('app.url')), 'label' => 'Open the app'])
@endsection
