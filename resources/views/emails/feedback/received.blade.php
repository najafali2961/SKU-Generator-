<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Feedback Received</title>
</head>

<body
    style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f0f2f5; color: #1a1d21; -webkit-font-smoothing: antialiased;">
    <div style="font-family: inherit; margin: 0; padding: 20px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
                        style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 24px -4px rgba(0, 0, 0, 0.08); overflow: hidden; margin: 20px auto;">

                        <!-- Header -->
                        <tr>
                            <td style="background-color: #008060; color: #ffffff; padding: 32px; text-align: center;">
                                <h1
                                    style="margin: 0 0 8px; font-size: 20px; font-weight: 600; letter-spacing: -0.01em; color: #ffffff; line-height: 1.4;">
                                    📝 New Feedback
                                </h1>
                                <p
                                    style="margin: 0; font-size: 14px; opacity: 0.9; letter-spacing: 0.01em; color: #e3f5f0;">
                                    A customer has submitted new feedback
                                </p>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 32px;">

                                <!-- Store -->
                                <div style="margin-bottom: 24px;">
                                    <div
                                        style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 6px; font-weight: 600;">
                                        Store</div>
                                    <div style="font-size: 16px; font-weight: 500; color: #1a1d21;">
                                        {{ $feedback->user->name }}</div>
                                </div>

                                <!-- Email -->
                                <div style="margin-bottom: 24px;">
                                    <div
                                        style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 6px; font-weight: 600;">
                                        Contact Email</div>
                                    <div style="font-size: 16px; font-weight: 500; color: #1a1d21;">
                                        <a href="mailto:{{ $feedback->user->email }}"
                                            style="color: #008060; text-decoration: none; border-bottom: 1px solid rgba(0,128,96,0.3);">
                                            {{ $feedback->user->email }}
                                        </a>
                                    </div>
                                </div>

                                <!-- Store Details (if available) -->
                                @if ($feedback->user->storeDetails)
                                    <div
                                        style="margin-bottom: 24px; padding: 16px; background-color: #f1f8f5; border-radius: 8px; border: 1px solid #e1e3e5;">
                                        <div
                                            style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #008060; margin-bottom: 12px; font-weight: 700;">
                                            Extended Store Details</div>

                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0"
                                            width="100%">
                                            <tr>
                                                <td width="50%" style="padding-bottom: 8px;">
                                                    <div style="font-size: 11px; color: #6b7280;">Owner</div>
                                                    <div style="font-size: 14px; color: #1a1d21; font-weight: 500;">
                                                        {{ $feedback->user->storeDetails->shop_name }}</div>
                                                </td>
                                                <td width="50%" style="padding-bottom: 8px;">
                                                    <div style="font-size: 11px; color: #6b7280;">Phone</div>
                                                    <div style="font-size: 14px; color: #1a1d21;">
                                                        {{ $feedback->user->storeDetails->phone ?? 'N/A' }}</div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td width="50%" style="padding-bottom: 8px;">
                                                    <div style="font-size: 11px; color: #6b7280;">Country</div>
                                                    <div style="font-size: 14px; color: #1a1d21;">
                                                        {{ $feedback->user->storeDetails->country }}
                                                        ({{ $feedback->user->storeDetails->currency }})</div>
                                                </td>
                                                <td width="50%" style="padding-bottom: 8px;">
                                                    <div style="font-size: 11px; color: #6b7280;">Plan</div>
                                                    <div style="font-size: 14px; color: #1a1d21;">
                                                        {{ $feedback->user->storeDetails->plan_name }}</div>
                                                </td>
                                                <td width="50%" style="padding-bottom: 8px;">
                                                    <div style="font-size: 11px; color: #6b7280;">Email</div>
                                                    <div style="font-size: 14px; color: #1a1d21;">
                                                        {{ $feedback->user->storeDetails->email }}</div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan="2">
                                                    <div style="font-size: 11px; color: #6b7280;">Primary Domain</div>
                                                    <div style="font-size: 14px; color: #1a1d21;">
                                                        <a href="https://{{ $feedback->user->storeDetails->primary_domain }}"
                                                            target="_blank"
                                                            style="color: #008060; text-decoration: none;">
                                                            {{ $feedback->user->storeDetails->primary_domain }}
                                                        </a>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                @endif

                                <!-- Message -->
                                <div style="margin-bottom: 32px;">
                                    <div
                                        style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 8px; font-weight: 600;">
                                        Feedback Message</div>
                                    <div
                                        style="background-color: #f8fafb; border-left: 3px solid #008060; padding: 20px; border-radius: 6px; font-style: italic;">
                                        <p style="margin: 0; font-size: 15px; color: #44474a; line-height: 1.6;">
                                            "{{ $feedback->message }}"
                                        </p>
                                    </div>
                                </div>

                                <!-- Meta Data Row -->
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
                                    style="margin-bottom: 32px;">
                                    <tr>
                                        <!-- Submitted Date -->
                                        <td width="50%" valign="top">
                                            <div
                                                style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 4px; font-weight: 600;">
                                                Submitted</div>
                                            <div style="font-size: 14px; color: #4a4d52;">
                                                {{ $feedback->created_at->format('M d, Y') }}</div>
                                        </td>
                                        <!-- Priority -->
                                        <td width="50%" valign="top">
                                            <div
                                                style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 4px; font-weight: 600;">
                                                Priority</div>
                                            <div
                                                style="font-size: 14px; color: #4a4d52; display: flex; align-items: center;">
                                                <span
                                                    style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #008060; margin-right: 6px;"></span>
                                                Normal
                                            </div>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Action Button -->
                                <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                                    <a href="mailto:{{ $feedback->user->email }}"
                                        style="display: inline-block; background-color: #008060; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 5px rgba(0, 128, 96, 0.2);">
                                        Reply to User
                                    </a>
                                </div>

                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td
                                style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #edf2f7;">
                                <p style="margin: 0; font-size: 12px; color: #8c9196;">
                                    &copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>
</body>

</html>
