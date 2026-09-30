import { config } from '../../config';
import { logger } from '../../utils/logger';

export interface TelegramAlertData {
  alertId: string;
  deviceId: string;
  triggerType: string;
  timestamp: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  batteryLevel?: number;
  isDemo?: boolean;
  notes?: string;
  imageBuffer?: Buffer;
}

export class TelegramService {
  private botToken: string;
  private chatId: string;
  private isConfigured: boolean;

  constructor() {
    this.botToken = config.telegram.botToken;
    this.chatId = config.telegram.chatId;
    this.isConfigured = Boolean(this.botToken && this.chatId);

    if (!this.isConfigured) {
      logger.info('Telegram service initialized in simulation mode (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not provided)');
    }
  }

  public async sendEmergencyNotification(alert: TelegramAlertData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const isDemo = alert.isDemo || alert.triggerType === 'DEMO';
    
    // Construct emergency notification text (MarkdownV2 safe or clean HTML/Markdown)
    const header = isDemo 
      ? '🟡 *[TEST / DEMO ALERT — NO DISPATCH REQUIRED]*\n🚨 *SHESECURE EMERGENCY ALERT SIMULATION*'
      : '🚨 *URGENT: SHESECURE EMERGENCY ALERT TRIGGERED*';

    const mapsLink = (alert.latitude && alert.longitude) 
      ? `https://maps.google.com/?q=${alert.latitude},${alert.longitude}`
      : null;

    const locationText = mapsLink 
      ? `📍 *Coordinates:* \`${alert.latitude?.toFixed(6)}, ${alert.longitude?.toFixed(6)}\`\n🎯 *Accuracy:* \`±${alert.accuracy ? alert.accuracy.toFixed(1) : 'Unknown'} m\`\n🗺️ [View on Google Maps](${mapsLink})`
      : '📍 *Location:* Unavailable / GPS Signal Lost';

    const batteryText = alert.batteryLevel !== undefined ? `🔋 *Battery Level:* \`${alert.batteryLevel}%\`` : '';

    const messageText = [
      header,
      '',
      `🆔 *Alert ID:* \`${alert.alertId}\``,
      `📱 *Device ID:* \`${alert.deviceId}\``,
      `⚡ *Trigger Type:* \`${alert.triggerType}\``,
      `⏰ *Timestamp:* \`${new Date(alert.timestamp).toUTCString()}\``,
      locationText,
      batteryText,
      alert.notes ? `📝 *Notes:* ${alert.notes}` : '',
      '',
      isDemo ? '_This alert was generated in Demo Mode for testing._' : '⚠️ _Immediate verification and dispatch recommended._'
    ].filter(Boolean).join('\n');

    if (!this.isConfigured) {
      logger.info('Telegram simulation: Alert dispatch simulated successfully', {
        alertId: alert.alertId,
        triggerType: alert.triggerType,
        isDemo
      });
      return { success: true, messageId: `simulated-${Date.now()}` };
    }

    try {
      if (alert.imageBuffer && alert.imageBuffer.length > 0) {
        return await this.sendPhotoMessage(messageText, alert.imageBuffer);
      } else {
        return await this.sendTextMessage(messageText);
      }
    } catch (err: any) {
      logger.error('Telegram API delivery error', { alertId: alert.alertId, error: err.message });
      return { success: false, error: err.message };
    }
  }

  private async sendTextMessage(text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      })
    });

    const data = await response.json() as any;
    if (!response.ok || !data.ok) {
      const errMsg = data.description || `HTTP ${response.status}`;
      return { success: false, error: errMsg };
    }

    return { success: true, messageId: String(data.result?.message_id) };
  }

  private async sendPhotoMessage(caption: string, imageBuffer: Buffer): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendPhoto`;
    
    const formData = new FormData();
    formData.append('chat_id', this.chatId);
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');
    
    // Create Blob from Buffer
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('photo', blob, 'stego_alert.png');

    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });

    const data = await response.json() as any;
    if (!response.ok || !data.ok) {
      const errMsg = data.description || `HTTP ${response.status}`;
      return { success: false, error: errMsg };
    }

    return { success: true, messageId: String(data.result?.message_id) };
  }
}

export const telegramService = new TelegramService();
