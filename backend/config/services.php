<?php

return [

    'kakao' => [
        'rest_api_key' => env('KAKAO_REST_API_KEY'),
        'client_secret' => env('KAKAO_CLIENT_SECRET'),
        'redirect' => env('KAKAO_REDIRECT_URI', 'http://localhost:3000/auth/kakao/callback'),
    ],

    'frontend' => [
        'url' => env('FRONTEND_URL', 'http://localhost:3000'),
    ],

    'web_push' => [
        'public_key' => env('VAPID_PUBLIC_KEY'),
        'private_key' => env('VAPID_PRIVATE_KEY'),
        'subject' => env('VAPID_SUBJECT'),
    ],

    'toss_payments' => [
        'secret_key' => env('TOSS_PAYMENTS_SECRET_KEY'),
        'webhook_security_key' => env('TOSS_PAYMENTS_WEBHOOK_SECURITY_KEY'),
        'base_url' => env('TOSS_PAYMENTS_BASE_URL', 'https://api.tosspayments.com'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', 'http://localhost:3000/auth/google/callback'),
    ],

    'gemini' => [
        'key' => env('GEMINI_API_KEY'),
        // 앞 모델의 할당량이 소진(429)되면 다음 모델로 자동 전환한다. 쉼표로 구분.
        // ai.google.dev/gemini-api/docs/pricing에서 무료 등급이 있다고 밝힌 텍스트 생성
        // 모델(음성·번역·임베딩 등 다른 용도 모델은 제외) 전부를, 한도가 넉넉한
        // flash-lite 계열을 앞세워 나열한다. 모델명이 나중에 바뀌거나 사라져도
        // 실패하면 다음 모델로 넘어갈 뿐이라 안전하다.
        'models' => array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('GEMINI_MODELS', implode(',', [
                'gemini-3.5-flash-lite',
                'gemini-3.1-flash-lite',
                'gemini-2.5-flash-lite',
                'gemini-3.7-flash',
                'gemini-3.6-flash',
                'gemini-3.5-flash',
                'gemini-2.5-flash',
                'gemini-3.1-pro-preview',
            ]))),
        ))),
    ],

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
