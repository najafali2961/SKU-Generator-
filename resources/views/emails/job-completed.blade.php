@extends('emails.layouts.master')

@section('title', 'Your job is complete')
@section('icon', '✅')
@section('heading', $jobTitle . ' — done!')
@section('subheading', 'Your task has finished processing.')

@section('content')
    <p style="margin: 0 0 14px; font-size: 16px; line-height: 1.65; color: #2b2f33;">
        Hi{{ $shopName ? ' ' . $shopName : '' }}, your <strong>{{ $jobTitle }}</strong> task has completed
        successfully. Here's a quick summary:
    </p>

    @include('emails.partials.stats', [
        'stats' => array_values(array_filter([
            $total !== null ? ['label' => 'Total items', 'value' => number_format($total), 'accent' => '#1a1d21'] : null,
            ['label' => 'Processed', 'value' => number_format($processed), 'accent' => '#008060'],
            $failed ? ['label' => 'Failed', 'value' => number_format($failed), 'accent' => '#c2410c'] : null,
        ])),
    ])

    @if ($failed)
        @include('emails.partials.note', [
            'tone' => 'warning',
            'text' => $failed . ' item(s) couldn\'t be processed. Open the app to review the details and retry if needed.',
        ])
    @else
        @include('emails.partials.note', [
            'tone' => 'success',
            'text' => 'Everything processed cleanly and was synced to your store. You\'re good to go!',
        ])
    @endif

    @if (!empty($downloadUrl))
        @include('emails.partials.button', ['url' => $downloadUrl, 'label' => '⬇  Download labels (ZIP)'])
        <p style="margin: 14px 0 0; text-align: center;">
            <a href="{{ ($appUrl ?? config('app.url')) }}" style="font-size: 13px; color: #6b7280; text-decoration: underline;">Or open the app</a>
        </p>
    @else
        @include('emails.partials.button', ['url' => ($appUrl ?? config('app.url')), 'label' => 'View results'])
    @endif
@endsection
