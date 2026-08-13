# Infinity Interns - Internship Management System

A comprehensive internship management platform with automatic certificate generation, admin approval system, and QR code verification.

## 🌟 Features

### For Admins
- **Admin Dashboard**: Manage all intern applications in one place
- **Approve/Reject Applications**: Review and process intern registrations
- **Update Performance Metrics**: Set attendance and marks for each intern
- **Certificate Generation**: Automatically generate certificates with custom design
- **Filter by Status**: View interns by PENDING, APPROVED, REJECTED, or COMPLETED status

### For Interns
- **Easy Registration**: Simple registration process with all necessary details
- **Application Tracking**: View real-time application status
- **Performance Metrics**: See attendance and marks when available
- **Certificate Download**: Download certificate PDF once issued
- **QR Code Access**: Each certificate includes a QR code for verification

### Public Features
- **Certificate Verification**: Anyone can verify certificates by certificate number
- **QR Code Scanning**: Scan QR codes from certificates for instant verification
- **Detailed Certificate View**: View complete certificate details without login

## 🚀 Technology Stack

- **Frontend**: Next.js 16.3, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js for authentication
- **Database**: SQLite with Prisma ORM
- **PDF Generation**: pdf-lib for certificate creation
- **QR Codes**: qrcode library
- **Authentication**: NextAuth.js with credentials provider
- **Password Hashing**: bcryptjs

## 📋 Prerequisites

- Node.js 18+ and npm
- Git

## 🛠️ Installation

1. **Clone the repository** (if applicable):
   ```bash
   git clone <repository-url>
   cd infinity-interns
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   The `.env` file is already configured with:
   ```
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-change-this-in-production-replace-with-random-string
   APP_URL=http://localhost:3000
   ```
   
   **Important**: For production, generate a secure random string for `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

4. **Set up the database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Create certificates directory**:
   ```bash
   mkdir -p public/certificates
   ```

## 🏃 Running the Application

### Development Mode
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Build
```bash
npm run build
npm start
```

## 👤 Login Credentials

### Admin Account
- **Email**: admin@infinityinterns.com
- **Password**: admin123

### Test Intern Account
Register a new account at `/auth/register` to test the full intern workflow.

## 📱 Application Flow

### Admin Workflow
1. Login with admin credentials
2. View all intern applications on the dashboard
3. Approve or reject applications
4. For approved interns, update attendance and marks
5. Generate certificates for completed interns
6. View and manage all certificates

### Intern Workflow
1. Register at `/auth/register` with personal and internship details
2. Wait for admin approval
3. Once approved, complete the internship
4. Admin updates performance metrics
5. Admin generates certificate
6. Download certificate and share QR code

### Public Verification
1. Visit `/verify` or scan QR code from certificate
2. Enter certificate number
3. View complete certificate details
4. Download PDF if needed

## 🗂️ Project Structure

```
infinity-interns/
├── app/
│   ├── admin/                 # Admin dashboard
│   ├── api/                   # API routes
│   │   ├── admin/            # Admin endpoints
│   │   ├── auth/             # Authentication
│   │   └── intern/           # Intern endpoints
│   ├── auth/                 # Login/Register pages
│   ├── dashboard/            # Intern dashboard
│   ├── verify/               # Certificate verification
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Homepage
│   └── providers.tsx         # Session provider
├── lib/
│   ├── auth.ts               # NextAuth configuration
│   ├── certificate-generator.ts  # PDF generation logic
│   └── prisma.ts             # Prisma client
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
├── public/
│   └── certificates/         # Generated PDF certificates
└── CREDENTIALS.md            # Login credentials
```

## 🎨 Certificate Design

The certificate includes:
- Golden decorative borders
- Infinity Interns branding
- Ministry logos area (placeholder)
- Intern name and college
- Internship domain and duration
- Start and end dates
- Attendance and marks percentages
- Unique certificate number
- QR code for verification
- Official signatures area

## 🔒 Security Features

- Password hashing with bcrypt
- JWT-based session management
- Role-based access control (ADMIN/INTERN)
- Protected API routes
- Secure certificate verification
- SQL injection protection via Prisma

## 🗄️ Database Schema

### Users
- Authentication credentials
- Role (ADMIN/INTERN)
- Basic user info

### InternProfile
- Personal details (college, course, semester)
- Internship details (domain, duration, dates)
- Performance metrics (attendance, marks)
- Application status

### Certificate
- Certificate number (unique)
- Intern information
- Performance data
- QR code data
- Verification URL
- PDF file path

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new intern
- `POST /api/auth/signin` - Login
- `POST /api/auth/signout` - Logout

### Admin (Protected)
- `GET /api/admin/interns` - List all interns
- `POST /api/admin/interns/approve` - Approve intern
- `POST /api/admin/interns/reject` - Reject intern
- `POST /api/admin/interns/update-metrics` - Update performance
- `POST /api/admin/certificates/generate` - Generate certificate

### Intern (Protected)
- `GET /api/intern/profile` - Get own profile
- `GET /api/intern/certificate` - Get own certificate

## 🐛 Troubleshooting

### Database Issues
```bash
# Reset database
rm dev.db
npx prisma db push
```

### Certificate Generation Fails
- Ensure `public/certificates` directory exists
- Check write permissions

### Login Issues
- Verify admin user exists in database
- Check NEXTAUTH_SECRET is set
- Clear browser cookies

## 🚀 Deployment

### Environment Variables for Production
Set these in your hosting platform:
```
DATABASE_URL=<your-production-database-url>
NEXTAUTH_URL=<your-production-url>
NEXTAUTH_SECRET=<secure-random-string>
APP_URL=<your-production-url>
```

### Recommended Platforms
- Vercel (recommended for Next.js)
- Railway
- Render
- AWS/GCP/Azure

## 📄 License

© 2026 Infinitya1 Career Counselling Private Limited. All rights reserved.

## 🤝 Support

For support, email info@infinityinterns.com or visit infinityinterns.com

---

Built with ❤️ using Next.js, TypeScript, and Tailwind CSS
