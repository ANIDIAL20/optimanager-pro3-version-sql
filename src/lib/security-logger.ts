import winston from 'winston';
import path from 'path';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

export const securityLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'security-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: path.join(process.cwd(), 'logs/security.log'), 
      level: 'warn' 
    })
  ],
});
