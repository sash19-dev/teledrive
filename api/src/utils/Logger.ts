import winston from 'winston'

const isProduction = process.env.ENV === 'production'

// Create logger instance
const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'teledrive-api' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          return `${timestamp} [${level}]: ${message} ${metaStr}`
        })
      )
    })
  ]
})

// If we're not in production, log to file as well
if (!isProduction) {
  logger.add(new winston.transports.File({
    filename: 'error.log',
    level: 'error'
  }))
  logger.add(new winston.transports.File({
    filename: 'combined.log'
  }))
}

export default logger

