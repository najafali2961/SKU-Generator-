<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Feedback Received</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f4f6f8;
            color: #202223;
        }

        .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        .header {
            background-color: #008060;
            color: #ffffff;
            padding: 24px;
            text-align: center;
        }

        .header h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
        }

        .content {
            padding: 32px;
        }

        .section {
            margin-bottom: 24px;
        }

        .label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #6d7175;
            margin-bottom: 4px;
            font-weight: 600;
        }

        .value {
            font-size: 16px;
            color: #202223;
        }

        .message-box {
            background-color: #f9fafb;
            border-left: 4px solid #008060;
            padding: 16px;
            border-radius: 4px;
            font-style: italic;
            margin-top: 8px;
        }

        .button-container {
            text-align: center;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e1e3e5;
        }

        .button {
            display: inline-block;
            background-color: #008060;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 4px;
            font-weight: 500;
        }

        .footer {
            background-color: #f4f6f8;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6d7175;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <h1>New Feedback Received</h1>
        </div>

        <div class="content">
            <div class="section">
                <div class="label">Store</div>
                <div class="value">{{ $feedback->user->name }}</div>
            </div>

            <div class="section">
                <div class="label">Contact Email</div>
                <div class="value">
                    <a href="mailto:{{ $feedback->user->email }}" style="color: #008060; text-decoration: none;">
                        {{ $feedback->user->email }}
                    </a>
                </div>
            </div>

            <div class="section">
                <div class="label">Feedback Message</div>
                <div class="message-box">
                    "{{ $feedback->message }}"
                </div>
            </div>

            <div class="button-container">
                <a href="mailto:{{ $feedback->user->email }}" class="button">Reply to User</a>
            </div>
        </div>

        <div class="footer">
            &copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
        </div>
    </div>
</body>

</html>
