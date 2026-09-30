import { Request, Response, NextFunction } from 'express';
import { alertService } from '../services/alert/alert.service';
import { createAlertSchema, updateAlertStatusSchema, acknowledgeAlertSchema, queryAlertsSchema, smsAlertSchema } from '../models/validation';
import { BadRequestError } from '../utils/errors';

export class AlertController {
  public async createAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('user-agent');

      // Check if file upload (LSB steganography carrier image)
      if (req.file) {
        const deviceId = (req.body.deviceId as string) || 'unknown-device';
        const triggerType = req.body.triggerType as string;

        const result = await alertService.processStegoAlert(req.file.buffer, {
          deviceId,
          triggerType,
          ipAddress,
          userAgent
        });

        res.status(result.isDuplicate ? 200 : 201).json({
          success: true,
          message: result.isDuplicate ? 'Alert acknowledged (duplicate)' : 'Emergency alert received and processed via steganography',
          isDuplicate: result.isDuplicate,
          data: result.alert
        });
        return;
      }

      // JSON Alert Submission
      const validated = createAlertSchema.parse(req.body);
      const result = await alertService.processAlert({
        alertId: validated.alertId,
        deviceId: validated.deviceId,
        timestamp: validated.timestamp,
        triggerType: validated.triggerType as any,
        encryptedPayload: validated.encryptedPayload,
        transportProtocol: validated.transportType as any || 'INTERNET_DIRECT',
        relayedByDeviceId: validated.relayedByDeviceId,
        relayHopCount: validated.relayHopCount,
        ipAddress,
        userAgent
      });

      res.status(result.isDuplicate ? 200 : 201).json({
        success: true,
        message: result.isDuplicate ? 'Alert acknowledged (duplicate)' : 'Emergency alert received and processed',
        isDuplicate: result.isDuplicate,
        data: result.alert
      });
    } catch (err) {
      next(err);
    }
  }

  public async ingestSmsAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = smsAlertSchema.parse(req.body);
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('user-agent');

      const result = await alertService.processSmsAlert(validated.smsText, {
        fromNumber: validated.fromNumber,
        ipAddress,
        userAgent
      });

      res.status(result.isDuplicate ? 200 : 201).json({
        success: true,
        message: result.isDuplicate ? 'SMS alert acknowledged (duplicate)' : 'Emergency SMS alert ingested and processed',
        isDuplicate: result.isDuplicate,
        data: result.alert
      });
    } catch (err) {
      next(err);
    }
  }

  public async getAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = queryAlertsSchema.parse(req.query);
      const result = await alertService.getAlerts(query);

      res.status(200).json({
        success: true,
        data: result.alerts,
        pagination: {
          total: result.total,
          limit: query.limit,
          offset: query.offset
        }
      });
    } catch (err) {
      next(err);
    }
  }

  public async getAlertStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await alertService.getDashboardStats();
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (err) {
      next(err);
    }
  }

  public async getAlertById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { alertId } = req.params;
      if (!alertId) throw new BadRequestError('alertId parameter is required');

      const authority = req.user ? {
        id: req.user.sub,
        email: req.user.email,
        role: req.user.role
      } : undefined;

      const alert = await alertService.getAlertById(alertId, authority);
      res.status(200).json({
        success: true,
        data: alert
      });
    } catch (err) {
      next(err);
    }
  }

  public async acknowledgeAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { alertId } = req.params;
      if (!alertId) throw new BadRequestError('alertId parameter is required');
      if (!req.user) throw new BadRequestError('User not authenticated');

      const validated = acknowledgeAlertSchema.parse(req.body);
      const updated = await alertService.acknowledgeAlert(
        alertId,
        {
          id: req.user.sub,
          email: req.user.email,
          role: req.user.role,
          name: req.user.name
        },
        validated.notes
      );

      res.status(200).json({
        success: true,
        message: 'Alert acknowledged successfully',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  public async updateAlertStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { alertId } = req.params;
      if (!alertId) throw new BadRequestError('alertId parameter is required');
      if (!req.user) throw new BadRequestError('User not authenticated');

      const validated = updateAlertStatusSchema.parse(req.body);
      const updated = await alertService.updateAlertStatus(
        alertId,
        validated.status,
        {
          id: req.user.sub,
          email: req.user.email,
          role: req.user.role
        },
        validated.reason
      );

      res.status(200).json({
        success: true,
        message: `Alert status updated to ${validated.status}`,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }
}

export const alertController = new AlertController();
