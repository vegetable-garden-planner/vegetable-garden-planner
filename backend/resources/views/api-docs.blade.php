<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="심어봄 Laravel API의 OpenAPI 문서">
    <title>심어봄 API 문서</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.32.11/swagger-ui.css">
    <style>
        html {
            box-sizing: border-box;
            overflow-y: scroll;
        }

        *,
        *::before,
        *::after {
            box-sizing: inherit;
        }

        body {
            margin: 0;
            background: #f8f7f2;
        }

        .swagger-ui .topbar {
            background: #073b2b;
        }

        .swagger-ui .topbar .download-url-wrapper .select-label select {
            border-color: #07966f;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.32.11/swagger-ui-bundle.js" crossorigin></script>
    <script>
        window.addEventListener('load', () => {
            window.ui = SwaggerUIBundle({
                url: @json(route('api-docs.specification')),
                dom_id: '#swagger-ui',
                deepLinking: true,
                displayRequestDuration: true,
                persistAuthorization: false,
                tryItOutEnabled: false,
                validatorUrl: null,
            });
        });
    </script>
</body>
</html>
