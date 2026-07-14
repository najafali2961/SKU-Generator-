@extends('shopify-app::layouts.default')

@section('styles')
    @routes

    {{ vite_assets() }}

    {{-- @viteReactRefresh
    @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"]) --}}


    @inertiaHead
@endsection

@section('content')
    @inertia
    {{-- Airo partner-apps pull-tab (right edge). Self-contained partial. --}}
    @include('partner-apps-dock', ['exclude' => 'barcode'])
@endsection


@section('scripts')
    @parent
    @php($crisp = \App\Support\CrispSession::for(Auth::user()))
    <script type="text/javascript" defer>
        window.$crisp = [];
        window.CRISP_WEBSITE_ID = "8305e843-f408-4c73-8b4d-c65666845987";
        window.$crisp.push(["config", "position:reverse", [true]]);
        window.$crisp.push(["config", "color:theme", ["black"]]);
        window.$crisp.push(["set", "user:avatar", [
            "https://cdn.shopify.com/s/files/1/0718/7723/0786/files/SKU.png?v=1772877734"
        ]]);
        @if ($crisp)
            // Name the visitor after their store — support should see the shop,
            // not "visitor276444". The giveaway/custom-credit links support uses
            // are still in session:data, built exactly as before.
            window.$crisp.push(["set", "user:nickname", [@json($crisp['nickname'])]]);
            @if ($crisp['email'])
                window.$crisp.push(["set", "user:email", [@json($crisp['email'])]]);
            @endif
            @if ($crisp['company'])
                window.$crisp.push(["set", "user:company", @json($crisp['company'])]);
            @endif
            window.$crisp.push(["set", "session:data", [@json($crisp['data'])]]);
            window.$crisp.push(["set", "session:segments", [@json($crisp['segments'])]]);
        @endif
        (function() {
            d = document;
            s = d.createElement("script");
            s.src = "https://client.crisp.chat/l.js";
            s.async = 1;
            d.getElementsByTagName("head")[0].appendChild(s);
        })();
    </script>
@endsection
