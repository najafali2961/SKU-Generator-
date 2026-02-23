<div class="px-4 py-2">
    @if ($message)
        <p class="text-sm dark:text-gray-200">
            {{ nl2br(e($message)) }}
        </p>
    @else
        <p class="text-sm italic text-gray-500">
            No message provided.
        </p>
    @endif
</div>
