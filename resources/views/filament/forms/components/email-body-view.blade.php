<x-dynamic-component :component="$getFieldWrapperView()" :field="$field">
    <!-- Use an iframe to render the html email body securely and isolated from the Filament dashboard styles -->
    <div x-data="{
        state: $wire.entangle('{{ $getStatePath() }}'),
        resizeIframe() {
            const iframe = $refs.emailIframe;
            if (iframe && iframe.contentWindow) {
                iframe.style.height = iframe.contentWindow.document.documentElement.scrollHeight + 50 + 'px';
            }
        }
    }" class="w-full border rounded-lg shadow-sm" style="background: white;">
        <iframe x-ref="emailIframe" class="w-full rounded-lg block" style="min-height: 80vh; background: white;"
            :srcdoc="state" sandbox="allow-same-origin allow-popups" frameborder="0"
            @load="resizeIframe()"></iframe>
    </div>
</x-dynamic-component>
