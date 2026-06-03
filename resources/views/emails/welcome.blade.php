@extends('emails.layouts.master')

@section('title', 'Welcome to Airo SKU & Barcode')
@section('icon', '🎉')
@section('heading', 'Welcome aboard' . ($shopName ? ', ' . $shopName : '') . '!')
@section('subheading', 'Your barcode & SKU toolkit is ready to go.')

@section('content')
    <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.65; color: #2b2f33;">
        Thanks for installing <strong>{{ config('app.name') }}</strong>. You can now generate barcodes,
        create clean SKUs, design print-ready labels and sync everything straight back to your store —
        all from one place.
    </p>

    @include('emails.partials.note', [
        'tone' => 'success',
        'text' => 'We\'ve added free credits to your account so you can start generating right away. No card required.',
    ])

    <p style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #1a1d21;">Here's a great way to start:</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 28px;">
        <tr>
            <td style="padding: 6px 0; font-size: 14px; line-height: 1.6; color: #44474a;">✅&nbsp;&nbsp;Generate barcodes (EAN, UPC, Code128) for your variants</td>
        </tr>
        <tr>
            <td style="padding: 6px 0; font-size: 14px; line-height: 1.6; color: #44474a;">🏷️&nbsp;&nbsp;Auto-create consistent SKUs across your catalog</td>
        </tr>
        <tr>
            <td style="padding: 6px 0; font-size: 14px; line-height: 1.6; color: #44474a;">🖨️&nbsp;&nbsp;Design and print labels with custom templates</td>
        </tr>
    </table>

    @include('emails.partials.button', ['url' => config('app.url'), 'label' => 'Open the app'])
@endsection
