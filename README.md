![img](./logoteledrive-white.png)

# TeleDrive - Enhanced & Improved

> **Note**: This is an enhanced and improved fork of the original [TeleDrive](https://github.com/mgilangjanuar/teledrive) project. The original repository has been archived, and this version continues development with modern improvements, bug fixes, and security enhancements.

This is the open source project of Google Drive/OneDrive/iCloud/Dropbox alternative using Telegram API for the free unlimited cloud storage.

[![img](https://drive.google.com/uc?id=1o2HnKglEF0-cvtNmQqWZicJnSCSmnoEr)](https://twitter.com/telegram/status/1428703364737507332)

## 🚀 What's New in This Version

This enhanced version includes significant improvements over the original:

### ✨ Enhancements

- **🔒 Security Improvements**
  - Added Helmet.js for security headers (XSS protection, HSTS, etc.)
  - Implemented rate limiting to prevent abuse
  - Enhanced CORS configuration for production
  - Improved password handling for public file access
  - Better authentication error handling

- **📊 Better Logging & Monitoring**
  - Integrated Winston logger for structured logging
  - Detailed request/response logging
  - File access and download progress tracking
  - Database connection health checks
  - Enhanced error reporting with context

- **⚡ Performance Optimizations**
  - Enabled compression middleware for faster responses
  - Improved database migration handling
  - Better caching strategies
  - Optimized file download progress tracking

- **🐛 Bug Fixes**
  - Fixed Telegram API compatibility (updated to v2.20.0)
  - Fixed database migration issues on Railway deployment
  - Fixed raw/download URL access for public files
  - Fixed TypeScript compilation errors
  - Improved session initialization for shared files

- **🔧 Developer Experience**
  - Better error messages and debugging info
  - Improved deployment scripts
  - Enhanced database health checks
  - Better environment variable handling

### 📦 Updated Dependencies

- Updated Telegram library to `^2.20.0` (fixes UPDATE_APP_TO_LOGIN errors)
- Added Winston for structured logging
- Added Helmet for security headers
- Updated all dependencies to latest stable versions

## Motivation

- [Google Photos ends the free storage service](https://www.techradar.com/news/google-photos-price)
- We deserve the free cloud storage service! Pricing: [Google Drive](https://one.google.com/about/plans), [OneDrive](https://one.google.com/about/plans), [Dropbox](https://www.dropbox.com/individual/plans-comparison), [iCloud](https://support.apple.com/en-us/HT201238)

## Getting Started

Read here for full instructions: [teledriveapp.com](https://teledriveapp.com)

## API Documentation

[![Run in Postman](https://run.pstmn.io/button.svg)](https://www.postman.com/restfireteam/workspace/mgilangjanuar/collection/1778529-3e4b0f8d-f721-4055-8d30-33cacaea93e6?ctx=documentation)

## How to Contribute

- Fork and clone this repository
- Commit your changes
- Create a pull request to the `staging` branch

Or, just send us an [issue](https://github.com/mgilangjanuar/teledrive/issues) for reporting bugs and/or ask the questions, share your ideas, etc in [discussions](https://github.com/mgilangjanuar/teledrive/discussions).

## Deploy to Railway

[![Deploy](https://railway.app/button.svg)](https://railway.app/template/bAyzUN?referralCode=skQmbg)

**Recommended**: Railway deployment includes automatic database migrations and improved error handling.

### Railway Deployment Features

- ✅ Automatic database migrations on startup
- ✅ Health check endpoints (`/ping`, `/api/health`)
- ✅ Structured logging with Winston
- ✅ Production-ready security headers
- ✅ Rate limiting protection
- ✅ Better error messages for troubleshooting

## Deploy to Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/mgilangjanuar/teledrive)

If you're experiencing issues check this https://github.com/mgilangjanuar/teledrive/issues/373

## Folder Structure

We using the monorepo structure with [yarn workspaces](https://classic.yarnpkg.com/en/docs/workspaces/).

```
.
├── README.md
├── package.json
├── api
│   ├── package.json
│   ├── src
│   │   ├── api
│   │   │   ├── v1
│   │   │   │   ├── Auth.ts
│   │   │   │   ├── Files.ts
│   │   │   │   └── ...
│   │   │   └── base
│   │   ├── model
│   │   ├── service
│   │   ├── utils
│   │   └── index.ts
│   ├── tsconfig.json
│   └── entrypoint.sh
├── web
│   ├── package.json
│   ├── public
│   ├── src
│   │   ├── pages
│   │   └── App.tsx
│   ├── tsconfig.json
│   └── yarn.lock
└── yarn.lock
```

## Key Improvements

### Security

- **Helmet.js**: Protects against common web vulnerabilities
- **Rate Limiting**: Prevents API abuse (100 requests per 15 minutes per IP)
- **Enhanced CORS**: Production-ready origin validation
- **Better Authentication**: Improved session handling and error messages

### Logging

- **Winston Logger**: Structured JSON logging for better observability
- **Request Tracking**: Log all API requests with IP, user agent, and query params
- **Error Context**: Detailed error logging with stack traces and context
- **Health Monitoring**: Database and Redis connection status logging

### Performance

- **Compression**: Gzip compression for all responses (reduces bandwidth by ~70%)
- **Caching**: Redis-based caching for frequently accessed data
- **Database Optimization**: Connection pooling and health checks

### Reliability

- **Auto-migrations**: Database migrations run automatically on Railway
- **Better Error Handling**: Graceful fallbacks and retry logic
- **Health Checks**: `/ping` and `/api/health` endpoints for monitoring

## Environment Variables

Key environment variables for deployment:

```bash
# Database
DATABASE_URL=postgresql://...

# Redis (optional but recommended)
REDIS_URL=redis://...

# Telegram API
TG_API_ID=your_api_id
TG_API_HASH=your_api_hash

# Server
ENV=production
PORT=8080
PUBLIC_URL=https://your-domain.com

# Security
API_JWT_SECRET=your_jwt_secret
FILES_JWT_SECRET=your_files_jwt_secret
ALLOWED_ORIGINS=https://your-domain.com,https://your-app.com
```

## Community

[![img](https://user-images.githubusercontent.com/34012548/172031316-60d858c7-8401-42f3-9c73-0b75e80c8292.png)](https://discord.gg/PKNVJwAZnR)

[![img](https://media.discordapp.net/attachments/978783095463501834/984317776544014416/ytbutton.png)](https://youtube.com/channel/UCg9WsNAHdOpo8SyM8JHGuZQ)

## License

MIT License - see [LICENSE.md](./LICENSE.md) for details.

## Acknowledgments

- Original project by [M Gilang Januar](https://github.com/mgilangjanuar)
- Enhanced and maintained by the community
- Built with ❤️ using Telegram API

---

**Note**: This is an actively maintained fork with improvements and bug fixes. The original repository status is archived, but this version continues development.
