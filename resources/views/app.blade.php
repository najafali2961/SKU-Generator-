@extends('shopify-app::layouts.default')

@section('styles')
    @routes

    {{ vite_assets() }}

    {{-- @viteReactRefresh --}}
    {{-- @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"]) --}}


    @inertiaHead
@endsection

@section('content')
    @inertia
@endsection


@section('scripts')
    @parent
    <script type="text/javascript" defer>
        window.$crisp = [];
        window.CRISP_WEBSITE_ID = "8305e843-f408-4c73-8b4d-c65666845987";
        window.$crisp.push(["config", "position:reverse", [false]]);
        window.$crisp.push(["set", "user:avatar",
            "https://cdn.shopify.com/app-store/listing_images/7d4945412c07915efc0b23fd85ee1d69/icon/CIeDzY3Xv5EDEAE=.png"
        ]);
        window.$crisp.push(["set", "session:data", [
            [
                ["store_id", "{{ Auth::user()->id ?? null }}"],
                ["store_name", "{{ Auth::user()->name ?? null }}"],
                ["store_domain", "{{ Auth::user()->storeDetails->primary_domain ?? null }}"],
                ["store_plan", "{{ Auth::user()->storeDetails->plan_name ?? null }}"],
                ["app_name", "Airo SKU & Barcode Generator"],
                ["app_plan", "{{ Auth::user()->plan->name ?? null }}"],
            ]
        ]]);
        (function() {
            d = document;
            s = d.createElement("script");
            s.src = "https://client.crisp.chat/l.js";
            s.async = 1;
            d.getElementsByTagName("head")[0].appendChild(s);
        })();
    </script>
@endsection
