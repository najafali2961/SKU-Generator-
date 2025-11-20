@extends('shopify-app::layouts.default')

@section('styles')
    @routes
    @viteReactRefresh
    @vite(['resources/js/app.jsx'])
    @inertiaHead
@endsection

@section('content')
    @inertia
@endsection
