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
