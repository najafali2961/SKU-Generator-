@php
    $user = $getRecord();
@endphp

@if (! $user)
    <span style="color:#9ca3af; font-size:12px;">—</span>
@elseif (method_exists($user, 'hasUnlimitedCredits') && $user->hasUnlimitedCredits())
    <span
        style="display:inline-block; padding:3px 10px; border-radius:9999px; background:#ecfdf5; color:#047857; font-size:11px; font-weight:700; letter-spacing:0.02em;">
        ∞ Unlimited
    </span>
@else
    @php
        $total = (int) ($user->credits ?? 0);
        $used = (int) ($user->credits_used ?? 0);
        $available = max(0, $total - $used);
        $pct = $total > 0 ? min(100, (int) round(($used / $total) * 100)) : ($used > 0 ? 100 : 0);

        // Green when comfortable, amber when getting close, red near/at the limit.
        $color = $pct >= 90 ? '#dc2626' : ($pct >= 70 ? '#f59e0b' : '#16a34a');
        $track = '#e9edf1';
    @endphp

    <div style="min-width:158px; max-width:200px;">
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px;">
            <span style="font-size:12px; font-weight:700; color:{{ $color }};">{{ number_format($used) }}</span>
            <span style="font-size:11px; color:#6b7280;">/ {{ number_format($total) }} limit</span>
        </div>

        <div style="height:8px; border-radius:9999px; background:{{ $track }}; overflow:hidden;">
            <div style="height:100%; width:{{ $pct }}%; background:{{ $color }}; border-radius:9999px; transition:width .2s;"></div>
        </div>

        <div style="margin-top:4px; font-size:10.5px; color:{{ $pct >= 90 ? '#dc2626' : '#6b7280' }}; font-weight:{{ $pct >= 90 ? 600 : 400 }};">
            @if ($available <= 0)
                Limit reached
            @else
                {{ number_format($available) }} remaining
            @endif
        </div>
    </div>
@endif
