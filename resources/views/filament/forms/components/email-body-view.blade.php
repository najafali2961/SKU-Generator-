<x-dynamic-component :component="$getFieldWrapperView()" :field="$field">
    <!-- Use an iframe to render the html email body securely and isolated from the Filament dashboard styles -->
    <div x-data="{ state: $wire.entangle('{{ $getStatePath() }}') }" class="w-full border rounded-lg shadow-sm" style="min-height: 500px;">
        <iframe class="w-full h-full rounded-lg" style="min-height: 500px;" :srcdoc="state"
            sandbox="allow-same-origin allow-popups" frameborder="0"></iframe>
    </div>
</x-dynamic-component>
