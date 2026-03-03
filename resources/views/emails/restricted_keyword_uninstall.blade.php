<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shop Uninstalled: Restricted Keyword Matched</title>
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
                            <td style="background-color: #c53030; color: #ffffff; padding: 32px; text-align: center;">
                                <h1
                                    style="margin: 0 0 8px; font-size: 20px; font-weight: 600; letter-spacing: -0.01em; color: #ffffff; line-height: 1.4;">
                                    ⚠️ Shop Uninstalled
                                </h1>
                                <p
                                    style="margin: 0; font-size: 14px; opacity: 0.9; letter-spacing: 0.01em; color: #ffebee;">
                                    Restricted keyword detected
                                </p>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 32px;">

                                <!-- Main Info -->
                                <div style="margin-bottom: 32px;">
                                    <p style="margin: 0 0 20px 0; font-size: 15px; color: #44474a;">
                                        The application was <strong>automatically uninstalled</strong> from the
                                        following Shopify store because it matched a restricted keyword.
                                    </p>

                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0"
                                        width="100%"
                                        style="background-color: #fff5f5; border-radius: 8px; border: 1px solid #feb2b2; padding: 20px;">
                                        <tr>
                                            <td style="padding-bottom: 16px;">
                                                <div
                                                    style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #742a2a; margin-bottom: 6px; font-weight: 600;">
                                                    Shop Domain</div>
                                                <div style="font-size: 16px; font-weight: 500; color: #1a1d21;">
                                                    {{ $shopDomain }}
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <div
                                                    style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #742a2a; margin-bottom: 6px; font-weight: 600;">
                                                    Matched Keyword</div>
                                                <div style="font-size: 16px; font-weight: 500; color: #c53030;">
                                                    {{ $matchedKeyword }}
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                </div>

                                <!-- Store Details -->
                                <div style="margin-bottom: 32px;">
                                    <div
                                        style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 12px; font-weight: 700;">
                                        Store Details (if available)</div>

                                    @if (empty($storeDetails))
                                        <div style="font-style: italic; color: #6b7280; font-size: 14px;">
                                            No store details available yet.
                                        </div>
                                    @else
                                        <div
                                            style="padding: 16px; background-color: #f8fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                                            <table role="presentation" border="0" cellpadding="0" cellspacing="0"
                                                width="100%">
                                                <tr>
                                                    <td width="50%" style="padding-bottom: 12px;">
                                                        <div style="font-size: 11px; color: #6b7280;">Shop Name</div>
                                                        <div style="font-size: 14px; color: #1a1d21; font-weight: 500;">
                                                            {{ $storeDetails['shop_name'] ?? 'N/A' }}
                                                        </div>
                                                    </td>
                                                    <td width="50%" style="padding-bottom: 12px;">
                                                        <div style="font-size: 11px; color: #6b7280;">Email</div>
                                                        <div style="font-size: 14px; color: #1a1d21;">
                                                            {{ $storeDetails['email'] ?? 'N/A' }}
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td width="50%" style="padding-bottom: 12px;">
                                                        <div style="font-size: 11px; color: #6b7280;">Phone</div>
                                                        <div style="font-size: 14px; color: #1a1d21;">
                                                            {{ $storeDetails['phone'] ?? 'N/A' }}
                                                        </div>
                                                    </td>
                                                    <td width="50%" style="padding-bottom: 12px;">
                                                        <div style="font-size: 11px; color: #6b7280;">Primary Domain
                                                        </div>
                                                        <div style="font-size: 14px; color: #1a1d21;">
                                                            {{ $storeDetails['primary_domain'] ?? 'N/A' }}
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td colspan="2">
                                                        <div style="font-size: 11px; color: #6b7280;">Description</div>
                                                        <div style="font-size: 14px; color: #1a1d21;">
                                                            {{ $storeDetails['description'] ?? 'N/A' }}
                                                        </div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </div>
                                    @endif
                                </div>

                                <!-- Final Note -->
                                <div
                                    style="margin-bottom: 24px; padding: 20px; background-color: #f1f5f9; border-radius: 8px; border-left: 4px solid #64748b;">
                                    <p style="margin: 0; font-size: 15px; color: #475569;">
                                        <strong>No further action is required</strong> — the shop has been successfully
                                        uninstalled via the Shopify API.
                                    </p>
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
