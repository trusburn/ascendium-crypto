# 🚀 Deployment Guide

Complete guide for deploying the Crypto Investment Platform to production.

## 📋 Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database schema deployed
- [ ] SSL certificate ready
- [ ] Domain name purchased
- [ ] Hosting service selected
- [ ] All tests passing
- [ ] Performance optimized

## 🌐 Hosting Options

### Option 1: Vercel (Recommended for React apps)

**Pros:**
- Automatic deployments from Git
- Built-in SSL
- Global CDN
- Serverless functions support

**Steps:**
1. Push code to GitHub repository
2. Connect repository to Vercel
3. Configure environment variables
4. Deploy automatically

**Configuration:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

### Option 2: Netlify

**Pros:**
- Easy drag-and-drop deployment
- Automatic HTTPS
- Form handling
- Split testing

**Steps:**
1. Build project: `npm run build`
2. Drag `dist` folder to Netlify
3. Configure custom domain
4. Set up environment variables

### Option 3: Hostinger/cPanel

**Pros:**
- Traditional hosting
- Full server control
- Email hosting included
- Database management

**Steps:**
1. Purchase hosting plan
2. Upload files via File Manager
3. Configure database
4. Set up SSL certificate

## 🔧 Environment Configuration

### Production Environment Variables

Create `.env.production`:

```env
# Supabase Production
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key

# Production Domain
VITE_APP_URL=https://yourdomain.com

# Analytics (Optional)
VITE_GA_TRACKING_ID=GA-XXXXXXXXX

# Security
VITE_ENVIRONMENT=production
VITE_DEBUG=false
```

### Supabase Production Setup

1. **Create Production Project:**
   ```bash
   # Create new Supabase project for production
   # Import database schema from database-schema.sql
   ```

2. **Configure Authentication:**
   - Set up OAuth providers
   - Configure JWT settings
   - Set up email templates

3. **Database Security:**
   - Review RLS policies
   - Set up backup schedules
   - Configure connection limits

## 🏗️ Build Process

### 1. Production Build
```bash
# Install dependencies
npm ci

# Run tests
npm run test

# Build for production
npm run build

# Preview build (optional)
npm run preview
```

### 2. Optimization
```bash
# Analyze bundle size
npx vite-bundle-analyzer

# Optimize images
npm run optimize-images

# Minify and compress
npm run build:optimize
```

## 🔒 SSL and Security

### SSL Certificate Setup

**For Hostinger/cPanel:**
1. Go to SSL/TLS section
2. Generate Let's Encrypt certificate
3. Force HTTPS redirects

**For Custom Domains:**
1. Configure DNS records
2. Verify domain ownership
3. Install SSL certificate

### Security Headers

Add to `.htaccess` (for Apache servers):
```apache
# Security Headers
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-Content-Type-Options "nosniff"
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"

# HTTPS Redirect
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

## 🌍 Domain Configuration

### DNS Settings

Configure these DNS records:

| Type  | Name | Value              | TTL |
|-------|------|--------------------|-----|
| A     | @    | Your-Server-IP     | 300 |
| A     | www  | Your-Server-IP     | 300 |
| CNAME | api  | your-domain.com    | 300 |

### Custom Domain with Vercel

1. Add domain in Vercel dashboard
2. Configure DNS records as provided
3. Wait for verification (24-48 hours)

### Custom Domain with Netlify

1. Go to Domain settings
2. Add custom domain
3. Configure DNS records
4. Enable HTTPS

## 📊 Performance Optimization

### 1. Image Optimization
```bash
# Compress images
npm install -g imagemin-cli
imagemin src/assets/* --out-dir=dist/assets --plugin=imagemin-mozjpeg --plugin=imagemin-pngquant
```

### 2. Code Splitting
```typescript
// Lazy load components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
```

### 3. Caching Strategy
```apache
# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/gif "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/pdf "access plus 1 month"
    ExpiresByType text/javascript "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

## 🔍 Testing Production

### 1. Functionality Testing
- [ ] User registration/login
- [ ] Dashboard data loading
- [ ] Deposit/withdrawal flows
- [ ] Admin panel access
- [ ] Mobile responsiveness
- [ ] 3D Bitcoin animation
- [ ] Chart interactions

### 2. Performance Testing
```bash
# Lighthouse audit
npm install -g lighthouse
lighthouse https://yourdomain.com --output=html

# Page speed insights
# Visit: https://pagespeed.web.dev/
```

### 3. Security Testing
- [ ] HTTPS enabled
- [ ] Security headers set
- [ ] RLS policies working
- [ ] Authentication flows secure
- [ ] API endpoints protected

## 📱 Mobile Testing

Test on various devices:
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] iPad (Safari)
- [ ] Android Tablet (Chrome)

### Mobile-Specific Checks:
- [ ] Touch interactions work
- [ ] 3D animations smooth
- [ ] Charts responsive
- [ ] Navigation accessible
- [ ] Forms usable

## 🔄 Continuous Deployment

### GitHub Actions (Vercel)
```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### GitLab CI/CD
```yaml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  script:
    - npm ci
    - npm run test

build:
  stage: build
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/

deploy:
  stage: deploy
  script:
    - # Deploy to your hosting service
```

## 🐛 Troubleshooting

### Common Issues

**1. Build Failures:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**2. Environment Variables Not Loading:**
- Check variable names start with `VITE_`
- Verify variables are set in hosting platform
- Restart application after changes

**3. Database Connection Issues:**
- Verify Supabase URL and keys
- Check RLS policies
- Confirm network connectivity

**4. SSL Certificate Problems:**
- Wait 24-48 hours for DNS propagation
- Check DNS records are correct
- Contact hosting support if issues persist

### Performance Issues

**1. Slow Loading:**
- Enable gzip compression
- Optimize images
- Implement lazy loading
- Use CDN for static assets

**2. Mobile Performance:**
- Reduce 3D animation complexity
- Optimize chart rendering
- Minimize JavaScript bundle

## 📈 Monitoring and Analytics

### 1. Set Up Analytics
```typescript
// Google Analytics
gtag('config', 'GA-TRACKING-ID', {
  page_title: document.title,
  page_location: window.location.href
});
```

### 2. Error Monitoring
```bash
# Install Sentry
npm install @sentry/react
```

### 3. Performance Monitoring
- Set up Lighthouse CI
- Monitor Core Web Vitals
- Track user interactions

## 🔧 Maintenance

### Regular Tasks
- [ ] Update dependencies monthly
- [ ] Monitor error logs weekly
- [ ] Backup database regularly
- [ ] Review security updates
- [ ] Optimize performance quarterly

### Database Maintenance
```sql
-- Regular cleanup
DELETE FROM transactions WHERE created_at < NOW() - INTERVAL '2 years';

-- Update statistics
ANALYZE;

-- Backup
pg_dump your_database > backup_$(date +%Y%m%d).sql
```

## 📞 Support

If you encounter issues during deployment:

1. Check the troubleshooting section
2. Review hosting platform documentation
3. Contact hosting support
4. Create an issue in the repository

---

**Success Checklist:**
- [ ] Site loads correctly
- [ ] All features functional
- [ ] SSL certificate active
- [ ] Performance optimized
- [ ] Mobile responsive
- [ ] Security headers set
- [ ] Analytics tracking
- [ ] Backup configured

🎉 **Congratulations! Your crypto investment platform is now live!**