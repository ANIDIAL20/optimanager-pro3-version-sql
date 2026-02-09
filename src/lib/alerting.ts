import { Resend } from 'resend';
import { getFailedTransactionsToday } from './db-monitor';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SystemAlert {
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    metadata?: any;
}

/**
 * Send an email alert via Resend
 */
export async function sendEmailAlert(alert: SystemAlert) {
    if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) {
        console.warn('⚠️ Resend not configured. Email alert skipped.');
        return;
    }

    try {
        await resend.emails.send({
            from: 'OptiManager Alerts <alerts@optimanager.com>',
            to: process.env.ADMIN_EMAIL!,
            subject: `${getSeverityEmoji(alert.severity)} ${alert.title}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <h2 style="color: #e74c3c;">${alert.title}</h2>
                    <p style="font-size: 16px;">${alert.message}</p>
                    <hr />
                    <p style="font-size: 14px; color: #666;">
                        <strong>Severity:</strong> ${alert.severity.toUpperCase()}<br />
                        <strong>Time:</strong> ${new Date().toLocaleString()}
                    </p>
                    ${alert.metadata ? `<pre style="background: #f4f4f4; padding: 10px; border-radius: 4px;">${JSON.stringify(alert.metadata, null, 2)}</pre>` : ''}
                </div>
            `
        });
        console.log(`📧 Email alert sent: ${alert.title}`);
    } catch (error: any) {
        console.error('❌ Failed to send email alert:', error.message);
    }
}

/**
 * Send an alert to external webhooks (Discord/Slack) and Email
 */
export async function sendAlert(alert: SystemAlert) {
    console.warn(`📢 ALERT [${alert.severity.toUpperCase()}]: ${alert.title} - ${alert.message}`);

    // Trigger Email for Critical/High
    if (alert.severity === 'critical' || alert.severity === 'high') {
        await sendEmailAlert(alert);
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        console.error('❌ DISCORD_WEBHOOK_URL not configured. Alert dropped.');
        return;
    }

    try {
        const failedCount = await getFailedTransactionsToday();
        
        // Define color based on severity
        const colors = {
            low: 0x3498db,      // Blue
            medium: 0xf1c40f,   // Yellow
            high: 0xe67e22,     // Orange
            critical: 0xe74c3c  // Red
        };

        const body = {
            embeds: [{
                title: `${getSeverityEmoji(alert.severity)} ${alert.title}`,
                description: alert.message,
                color: colors[alert.severity] || colors.medium,
                fields: [
                    { name: 'Severity', value: alert.severity.toUpperCase(), inline: true },
                    { name: 'Failures Today', value: failedCount.toString(), inline: true },
                    ...(alert.metadata ? [{ name: 'Metadata', value: JSON.stringify(alert.metadata, null, 2).substring(0, 1000) }] : [])
                ],
                timestamp: new Date().toISOString()
            }]
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Discord API responded with status ${response.status}`);
        }

        console.log(`✅ Alert sent to Discord: ${alert.title}`);
    } catch (error: any) {
        console.error('❌ Failed to send alert:', error.message);
    }
}

function getSeverityEmoji(severity: string): string {
    switch (severity) {
        case 'critical': return '🚨';
        case 'high': return '🔴';
        case 'medium': return '🟡';
        case 'low': return 'ℹ️';
        default: return '📢';
    }
}
