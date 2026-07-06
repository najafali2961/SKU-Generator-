@extends('emails.layouts.master')

@section('title', 'Pricing is live')
@section('icon', '🚀')
@section('heading', 'Our free beta has ended — pricing is live')
@section('subheading', 'Here is exactly what changes for your store, and what stays free.')

@section('content')
    <p style="margin: 0 0 22px; font-size: 16px; line-height: 1.65; color: #2b2f33;">
        Hi{{ $shopName ? ' ' . $shopName : '' }}, thank you for being part of the
        <strong>{{ config('app.name') }}</strong> beta. Starting today the app moves to paid plans — and as a
        thank-you, <strong>your store keeps working on the Free plan automatically</strong>. Nothing is charged
        unless you choose to upgrade.
    </p>

    <p style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #1a1d21;">Your account today</p>

    @include('emails.partials.stats', [
        'stats' => [
            ['label' => 'Your plan', 'value' => 'Free', 'accent' => '#7c3aed'],
            ['label' => 'Free credits / 30 days', 'value' => number_format($freeCredits), 'accent' => '#008060'],
            ['label' => 'Cost per SKU / barcode', 'value' => $skuCost . ' credit' . ($skuCost === 1 ? '' : 's'), 'accent' => '#1a1d21'],
        ],
    ])

    @include('emails.partials.note', [
        'tone' => 'success',
        'text' => "Fresh start: any usage from the beta has been reset to zero. Your " . number_format($freeCredits) . " free credits renew every 30 days — no card required.",
    ])

    <p style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #1a1d21;">How credits work</p>
    <ul style="margin: 0 0 24px; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #2b2f33;">
        <li>Every <strong>SKU or barcode</strong> you generate uses {{ $skuCost }} credit{{ $skuCost === 1 ? '' : 's' }}.</li>
        <li><strong>Label printing</strong> uses {{ $labelCost }} credit{{ $labelCost === 1 ? '' : 's' }} per label.</li>
        <li>Credits <strong>refresh every 30 days</strong> on all plans — including Free.</li>
        <li>The Free plan includes all core tools: SKU generation, barcode generation and label printing.</li>
    </ul>

    @if (count($plans))
        <p style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #1a1d21;">Need more? The new plans</p>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
            style="margin: 0 0 8px; border-collapse: collapse;">
            <tr>
                <td style="padding: 8px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; border-bottom: 1px solid #e6ece9;">Plan</td>
                <td style="padding: 8px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; border-bottom: 1px solid #e6ece9;">Credits / 30 days</td>
                <td style="padding: 8px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; border-bottom: 1px solid #e6ece9;">Price</td>
            </tr>
            @foreach ($plans as $plan)
                <tr>
                    <td style="padding: 10px; font-size: 14px; font-weight: 700; color: #1a1d21; border-bottom: 1px solid #f0f3f2;">{{ $plan['name'] }}</td>
                    <td style="padding: 10px; font-size: 14px; color: #2b2f33; border-bottom: 1px solid #f0f3f2;">{{ $plan['credits'] }}</td>
                    <td style="padding: 10px; font-size: 14px; color: #2b2f33; border-bottom: 1px solid #f0f3f2;">{{ $plan['price'] }}</td>
                </tr>
            @endforeach
        </table>
        <p style="margin: 0 0 24px; font-size: 13px; line-height: 1.6; color: #6b7280;">
            Every paid plan starts with a free trial, and you can cancel anytime — billing runs securely through
            Shopify.
        </p>
    @endif

    @include('emails.partials.button', [
        'url' => ($appUrl ?? config('app.url')) . '/pricing',
        'label' => 'See plans & pricing',
    ])

    <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.6; color: #6b7280;">
        Questions about the change, or need a hand picking a plan? Just reply to this email — we read everything.
    </p>
@endsection
