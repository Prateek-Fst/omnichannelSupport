import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const emailUser = this.configService.get('EMAIL_USER');
    const emailPassword = this.configService.get('EMAIL_APP_PASSWORD');
    
    if (!emailUser || !emailPassword) {
      this.logger.warn('Email credentials not configured. Email functionality will be disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });
    
    this.logger.log('Email service initialized successfully');
  }

  async sendInviteEmail(
    email: string,
    inviterName: string,
    orgName: string,
    role: string,
    inviteToken: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.error('Email service not configured. Cannot send invitation email.');
      throw new Error('Email service not configured');
    }

    const acceptUrl = `${this.configService.get('FRONTEND_URL')}/accept-invite?token=${inviteToken}`;
    
    const mailOptions = {
      from: this.configService.get('EMAIL_USER'),
      to: email,
      subject: `You're invited to join ${orgName} on DelightChat`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You're invited to join ${orgName}</h2>
          <p>Hi there!</p>
          <p>${inviterName} has invited you to join <strong>${orgName}</strong> as a <strong>${role}</strong> on DelightChat.</p>
          <p>Click the button below to accept your invitation and set up your account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${acceptUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${acceptUrl}</p>
          <p>This invitation will expire in 7 days.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      `,
    };

    try {
      this.logger.log(`Attempting to send invite email to ${email}`);
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Invite email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send invite email to ${email}:`, error);
      throw new Error('Failed to send invitation email');
    }
  }
}