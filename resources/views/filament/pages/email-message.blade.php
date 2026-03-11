<div class="prose max-w-none dark:prose-invert">
    @if (isset($html) && $html)
        {!! $html !!}
    @else
        <pre class="whitespace-pre-wrap font-sans">{{ $text }}</pre>
    @endif
</div>
