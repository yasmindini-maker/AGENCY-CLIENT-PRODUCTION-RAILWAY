# Agency Client Portal

A production-ready, multi-tenant agency client portal SaaS designed for small agencies. Manage client projects, milestones, tasks, deliverables, invoices, notifications, and activity in one unified workspace.

## 🚀 Features

- **Multi-Tenant Architecture**: Complete role-based access control with strict data isolation
- **Authentication**: Clerk-powered authentication with magic link invites
- **Role-Based Access**: Agency Admin, Agency Member, and Client roles with granular permissions
- **Project Management**: Projects, milestones, tasks, and deliverables tracking
- **Client Portal**: Dedicated client access to their invited projects only
- **Billing**: Invoice management and payment tracking
- **File Management**: Persistent file uploads with Cloudflare R2 integration
- **White-Labeling**: Customizable agency branding and appearance
- **Real-Time Updates**: Activity feed and notifications
- **Security**: Enterprise-grade security with rate limiting, CORS, and input validation

## 🏗️ Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Express 5, TypeScript, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Clerk
- **File Storage**: Cloudflare R2 (S3-compatible)
- **API**: OpenAPI specification with generated React Query hooks
- **Build**: esbuild, pnpm workspaces

## 📋 Prerequisites

- Node.js 24+
- pnpm package manager
- PostgreSQL database
- Clerk account
- Cloudflare R2 account (optional, for file storage)

## 🔧 Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd Agency-Client-Portal
pnpm install
```

### 2. Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Configure the following environment variables:

#### Database
```env
DATABASE_URL=postgresql://user:password@localhost:5432/agency_portal
```

#### Clerk Authentication
```env
CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_here
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

Get your Clerk keys from [Clerk Dashboard](https://dashboard.clerk.com/)

#### Application
```env
APP_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
PORT=5000
NODE_ENV=development
```

#### Cloudflare R2 (Optional)
```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=agency-portal-deliverables
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

#### Development
```env
TEST_AUTH_SECRET=dev_test_secret_change_in_production
```

### 3. Database Setup

```bash
# Push database schema
pnpm --filter @workspace/db run push

# The API server will automatically seed demo data on first run
```

### 4. Clerk Configuration

1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new application
3. Configure allowed redirect URLs in Clerk Dashboard:
   - `http://localhost:5173/sign-in`
   - `http://localhost:5173/sign-up`
   - `http://localhost:5173/accept-invite`
4. Enable magic links in Clerk settings
5. Copy your publishable and secret keys to `.env`

### 5. Cloudflare R2 Setup (Optional)

1. Create a Cloudflare account
2. Create an R2 bucket
3. Create API tokens with R2 access
4. Configure CORS on your R2 bucket:
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "PUT", "DELETE"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```
5. Add R2 credentials to `.env`

### 6. Run Development Servers

```bash
# Terminal 1: API Server
pnpm --filter @workspace/api-server run dev

# Terminal 2: Frontend
pnpm --filter @workspace/agency-client-portal run dev
```

The API will run on `http://localhost:5000` and the frontend on `http://localhost:5173`.

## 🚢 Deployment Guide

### Vercel (Frontend)

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy frontend:
```bash
cd artifacts/agency-client-portal
vercel
```
3. Configure environment variables in Vercel dashboard:
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `VITE_API_URL` (your deployed API URL)

### Railway/Render (Backend)

#### Railway
1. Create a Railway account
2. Create a new project
3. Add PostgreSQL database
4. Deploy the API server:
```bash
# In Railway, set build command:
pnpm install && pnpm run build

# Set start command:
pnpm run start
```
5. Configure environment variables in Railway dashboard

#### Render
1. Create a Render account
2. Create a new Web Service
3. Connect your GitHub repository
4. Configure:
   - Build Command: `pnpm install && pnpm run build`
   - Start Command: `pnpm run start`
5. Add PostgreSQL database
6. Configure environment variables

### Environment Variables for Production

Make sure to set these in your production environment:

```env
NODE_ENV=production
DATABASE_URL=your_production_database_url
CLERK_PUBLISHABLE_KEY=your_production_clerk_key
CLERK_SECRET_KEY=your_production_clerk_secret
VITE_CLERK_PUBLISHABLE_KEY=your_production_clerk_key
APP_URL=your_production_url
CORS_ORIGINS=your_production_url,additional_allowed_origins
R2_ACCOUNT_ID=your_production_r2_account_id
R2_ACCESS_KEY_ID=your_production_r2_access_key
R2_SECRET_ACCESS_KEY=your_production_r2_secret
R2_BUCKET_NAME=your_production_bucket_name
R2_PUBLIC_URL=your_production_r2_public_url
```

## 🎨 White-Labeling

Customize the portal appearance to match your agency brand:

### 1. Agency Settings

Navigate to `/settings` in the portal to customize:

- **Agency Name**: Your agency's name
- **Brand Name**: Display name for clients
- **Website**: Your agency website
- **Support Email**: Client support contact
- **Portal Intro**: Welcome message for clients
- **Show Powered By**: Toggle branding footer

### 2. Custom Styling

The portal uses Tailwind CSS with a design system. To customize colors and styling:

1. Edit `artifacts/agency-client-portal/src/index.css`
2. Modify CSS variables and Tailwind config
3. Rebuild the frontend

### 3. Custom Domain

Set up a custom domain for your client portal:

1. Configure your domain DNS to point to your deployment
2. Update `APP_URL` and `CORS_ORIGINS` environment variables
3. Update Clerk allowed redirect URLs
4. Rebuild and redeploy

## 🔐 Security Features

- **Authentication**: Clerk-powered JWT authentication
- **Role-Based Access Control**: Strict permissions for each user role
- **Data Isolation**: Agencies only see their own data; clients only see invited projects
- **Rate Limiting**: Configurable rate limits per endpoint
- **CORS Protection**: Configurable allowed origins
- **Input Validation**: Zod schema validation on all inputs
- **Security Headers**: Helmet.js with comprehensive security headers
- **File Upload Security**: Type validation, size limits, and virus scanning
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **XSS Protection**: Input sanitization and CSP headers

## 🧪 Testing

Run security tests:
```bash
pnpm --filter @workspace/api-server run test:security
```

Run type checking:
```bash
pnpm run typecheck
```

## 📁 Project Structure

```
Agency-Client-Portal/
├── artifacts/
│   ├── agency-client-portal/    # React frontend
│   ├── api-server/              # Express backend
│   └── mockup-sandbox/          # Design mockups
├── lib/
│   ├── api-client-react/        # Generated API client
│   ├── api-spec/                # OpenAPI specification
│   ├── api-zod/                 # Generated Zod schemas
│   └── db/                      # Database schema and migrations
├── scripts/                     # Utility scripts
├── .env.example                 # Environment variables template
├── package.json                 # Root package.json
├── pnpm-workspace.yaml          # pnpm workspace configuration
└── README.md                    # This file
```

## 🤝 Roles and Permissions

### Agency Admin
- Full access to all agency data
- Manage team members (invite/remove)
- Manage clients and projects
- Update agency settings and white-labeling
- Full financial access

### Agency Member
- Access to all agency projects
- Manage projects, tasks, and deliverables
- Create and manage invoices
- Cannot manage team members or agency settings

### Client
- Access only to invited projects
- View project progress and deliverables
- View and pay invoices
- Cannot manage agency settings or other projects

## 📄 License

MIT License - See LICENSE file for details

## 💰 Selling on LemonSqueezy

This product is production-ready and priced at $100 for sale on LemonSqueezy. It includes:

- Complete source code
- Multi-tenant architecture
- Clerk authentication integration
- Cloudflare R2 file storage
- Security hardening
- Comprehensive documentation
- Deployment guides

## 🆘 Support

For support and questions:
- Email: your-support-email
- Documentation: See inline code comments
- Issues: Create issues in your repository

## 🔄 Updates and Maintenance

### Regular Maintenance Tasks

1. **Update Dependencies**: Run `pnpm update` regularly
2. **Security Patches**: Monitor security advisories for dependencies
3. **Database Backups**: Regular PostgreSQL backups
4. **Log Monitoring**: Monitor API logs for suspicious activity
5. **Performance**: Monitor database performance and optimize queries

### Scaling Considerations

- **Database**: Consider read replicas for high traffic
- **File Storage**: R2 scales automatically, monitor costs
- **API**: Consider load balancing for high traffic
- **Caching**: Implement Redis for session/cache if needed

---

Built with ❤️ for small agencies to streamline client project management.