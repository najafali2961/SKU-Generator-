<x-dynamic-component :component="$getFieldWrapperView()" :field="$field">
    <!-- Use an iframe to render the html email body securely and isolated from the Filament dashboard styles -->
    <div x-data="{ state: $wire.entangle('{{ $getStatePath() }}') }" class="w-full border rounded-lg shadow-sm">
        <iframe class="w-full rounded-lg block" style="min-height: 80vh;" :srcdoc="state"
            sandbox="allow-same-origin allow-popups" frameborder="0"></iframe>
    </div>
</x-dynamic-component>
