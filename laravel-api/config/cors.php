<?php

/**
 * CORS Configuration for Sync API
 * 
 * Update your config/cors.php with these settings to allow
 * the React PWA to communicate with your Laravel API.
 */

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | These settings determine what cross-origin requests are allowed.
    | For the scanning PWA, we need to allow requests from:
    | - localhost (development)
    | - Your production PWA domain
    |
    */

    'paths' => [
        'api/*',
        'sanctum/csrf-cookie',
        'event/*',           // For existing batch_verify endpoint
    ],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        // Development
        'http://localhost:5173',      // Vite dev server
        'http://localhost:3000',      // Alternative dev port
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        
        // Production - Update with your actual domain
        'https://scanner.263tickets.com',
        'https://scan.263tickets.com',
        
        // PWA installed on device (may use different origin)
        // Add your Vercel deployment URL here
        'https://react-scanning.vercel.app',
    ],

    'allowed_origins_patterns' => [
        // Allow any subdomain of 263tickets.com
        '#^https://.*\.263tickets\.com$#',
        
        // Allow Vercel preview deployments
        '#^https://.*\.vercel\.app$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,  // Required for Sanctum auth

];
