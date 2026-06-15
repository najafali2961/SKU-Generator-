<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Max file size the viewer will parse
    |--------------------------------------------------------------------------
    |
    | rap2hpoutre/laravel-log-viewer reads the whole log file into memory and
    | then runs preg_match_all + preg_split over it, so peak usage is several
    | times the file size. The package default (50 MB) is well above PHP's
    | 128 MB memory_limit and causes "Allowed memory size exhausted" fatals.
    |
    | Below this size the viewer skips parsing and offers a download link
    | instead of crashing. Keep it comfortably under memory_limit / ~5.
    |
    */
    'max_file_size' => env('LOGVIEWER_MAX_FILE_SIZE', 10485760), // 10 MB

    'pattern'      => env('LOGVIEWER_PATTERN', '*.log'),
    'storage_path' => env('LOGVIEWER_STORAGE_PATH', storage_path('logs')),
];
