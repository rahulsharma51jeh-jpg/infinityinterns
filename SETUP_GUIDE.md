# Infinity Interns - Complete Setup Guide

## 🎯 Quick Start (5 Minutes)

Follow these steps to get the application running:

### Step 1: Install Dependencies
```bash
cd infinity-interns
npm install
```

### Step 2: Setup Database
```bash
npx prisma generate
npx prisma db push
```

### Step 3: Create Certificates Directory
```bash
mkdir -p public/certificates
```

### Step 4: Start the Development Server
```bash
npm run dev
```

### Step 5: Access the Application
Open your browser and navigate to: **http://localhost:3000**

## 👤 Test the Application

### Admin Login
1. Go to http://localhost:3000/auth/login
2. Use these credentials:
   - **Email**: admin@infinityinterns.com
   - **Password**: admin123

### Test Intern Registration
1. Go to http://localhost:3000/auth/register
2. Fill in the registration form with test data
3. Login with the credentials you created
4. View your dashboard at http://localhost:3000/dashboard

## 🔄 Complete Workflow Test

### 1. Register an Intern
- Navigate to `/auth/register`
- Fill in all required fields:
  - Name: Test Student
  - Email: student@test.com
  - Password: test123
  - College: Test University
  - Internship Domain: Web Development
  - Duration: 4 Weeks
  - Start Date: Current date
  - End Date: 4 weeks from now
- Submit the form

### 2. Admin Approval
- Login as admin at `/auth/login`
- Go to admin dashboard at `/admin`
- You'll see the pending application
- Click "Approve" to approve the student

### 3. Update Performance Metrics
- In the admin dashboard, filter by "APPROVED"
- Click "Update Metrics" for the approved intern
- Enter:
  - Attendance: 88
  - Marks: 93
- Submit

### 4. Generate Certificate
- Still in the "APPROVED" filter
- Click "Generate Certificate"
- Confirm the action
- Certificate will be generated with unique number

### 5. View Certificate as Intern
- Logout from admin
- Login as the intern (student@test.com)
- Go to dashboard at `/dashboard`
- You'll see your certificate with:
  - Certificate number
  - QR code
  - Download button
  - View certificate button

### 6. Verify Certificate
- Copy the certificate number
- Go to `/verify` (no login required)
- Enter the certificate number
- View complete certificate details
- Or scan the QR code with your phone

## 📂 File Structure Explained

### Important Directories

**`/app`** - Next.js App Router
- `/admin` - Admin dashboard page
- `/api` - All API endpoints
- `/auth` - Login and registration pages
- `/dashboard` - Intern dashboard
- `/verify` - Public certificate verification

**`/lib`** - Utility functions
- `auth.ts` - NextAuth configuration
- `certificate-generator.ts` - PDF generation logic
- `prisma.ts` - Database client

**`/prisma`** - Database
- `schema.prisma` - Database models
- `dev.db` - SQLite database file (created after setup)

**`/public/certificates`** - Generated certificates stored here

## 🔧 Configuration Files

### `.env`
Contains environment variables:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
APP_URL=http://localhost:3000
```

### `prisma/schema.prisma`
Database schema with three main models:
- **User**: Authentication and basic info
- **InternProfile**: Intern details and status
- **Certificate**: Certificate data and verification

## 🎨 Customization Guide

### Change Certificate Design
Edit `/lib/certificate-generator.ts`:
- Modify colors, fonts, and layout
- Add custom logos
- Adjust spacing and positioning

### Modify Internship Durations
Edit `/app/auth/register/page.tsx`:
```tsx
<option value="2 Weeks">2 Weeks</option>
<option value="4 Weeks">4 Weeks</option>
// Add more options
```

### Add More Admin Users
Run in database:
```sql
INSERT INTO users (id, email, password, name, role, createdAt, updatedAt)
VALUES ('admin_002', 'admin2@infinityinterns.com', '<hashed-password>', 'Admin 2', 'ADMIN', datetime('now'), datetime('now'));
```

Generate hashed password:
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('yourpassword', 10).then(hash => console.log(hash))"
```

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module '@prisma/client'"
**Solution**:
```bash
npx prisma generate
```

### Issue: Database not found
**Solution**:
```bash
npx prisma db push
```

### Issue: Certificate generation fails
**Solution**:
```bash
mkdir -p public/certificates
chmod 755 public/certificates
```

### Issue: Login not working
**Solution**:
1. Clear browser cookies
2. Verify admin user exists:
```bash
sqlite3 dev.db "SELECT * FROM users WHERE role='ADMIN';"
```
3. If no admin user, insert one manually

### Issue: Port 3000 already in use
**Solution**:
```bash
# Use a different port
npm run dev -- -p 3001
```

## 📊 Database Management

### View All Interns
```bash
sqlite3 dev.db "SELECT u.name, ip.status, ip.college FROM users u JOIN intern_profiles ip ON u.id = ip.userId;"
```

### View All Certificates
```bash
sqlite3 dev.db "SELECT certificateNo, internName, issuedAt FROM certificates;"
```

### Reset Database
```bash
rm dev.db
npx prisma db push
# Re-insert admin user
```

## 🚀 Production Deployment Checklist

- [ ] Change `NEXTAUTH_SECRET` to a secure random string
- [ ] Update `APP_URL` to your production domain
- [ ] Use PostgreSQL or MySQL instead of SQLite
- [ ] Set up proper file storage for certificates (S3, etc.)
- [ ] Enable HTTPS
- [ ] Set up email notifications
- [ ] Configure rate limiting
- [ ] Add monitoring and logging
- [ ] Set up automated backups
- [ ] Review security settings

## 📧 Email Notifications (Optional Enhancement)

To add email notifications:
1. Install nodemailer: `npm install nodemailer`
2. Configure SMTP settings in `.env`
3. Add email sending in approval/rejection handlers

## 🔐 Security Best Practices

1. **Change Default Admin Password** immediately after first login
2. **Use Strong Secrets** for NEXTAUTH_SECRET in production
3. **Enable HTTPS** in production
4. **Regular Backups** of the database
5. **Monitor API Usage** to prevent abuse
6. **Keep Dependencies Updated**: `npm audit` regularly

## 📱 Mobile Responsiveness

The application is fully responsive and works on:
- Desktop (1920px+)
- Laptop (1366px - 1920px)
- Tablet (768px - 1366px)
- Mobile (320px - 768px)

## 🎓 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Guides](https://www.prisma.io/docs)
- [NextAuth.js](https://next-auth.js.org/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 💬 Support

If you encounter any issues:
1. Check this guide first
2. Review the README.md
3. Check browser console for errors
4. Review server logs in terminal
5. Contact: info@infinityinterns.com

---

**Happy Coding! 🎉**
