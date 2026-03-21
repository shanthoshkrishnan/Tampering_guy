# Deployment Guide - TamperGuard

Complete guide for deploying TamperGuard to production.

## 📋 Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Firebase Setup](#firebase-setup)
- [Environment Configuration](#environment-configuration)
- [Build & Deploy](#build--deploy)
- [Post-Deployment](#post-deployment)
- [Rollback Procedure](#rollback-procedure)
- [Maintenance](#maintenance)

---

## ✅ Pre-Deployment Checklist

Before deploying to production, ensure:

### Code Quality
- [ ] All tests passing locally
- [ ] No console errors in production build
- [ ] Code reviewed and approved
- [ ] Security audit completed
- [ ] Performance testing done

### Configuration
- [ ] Production environment variables set
- [ ] Different Firebase project for production
- [ ] MQTT broker credentials secured
- [ ] Email service configured
- [ ] Analytics enabled

### Documentation
- [ ] README updated
- [ ] API documentation current
- [ ] User manual available
- [ ] Admin guide available

---

## 🔥 Firebase Setup

### 1. Create Production Firebase Project

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# List projects
firebase projects:list
```

**In Firebase Console:**
1. Go to https://console.firebase.google.com/
2. Click "Add Project"
3. Name: `tamperguard-production`
4. Enable Google Analytics (optional)
5. Select region (closest to users)

### 2. Enable Services

**Authentication:**
1. Navigate to Authentication → Sign-in method
2. Enable Email/Password
3. Email enumeration protection: Enabled
4. Configure authorized domains

**Firestore Database:**
1. Navigate to Firestore Database
2. Create database in Production mode
3. Select region (same as project)
4. Deploy security rules (see below)
5. Create indexes (see below)

**Firebase Hosting:**
1. Navigate to Hosting
2. Get started
3. Note the hosting URL

**Cloud Functions (if using):**
1. Navigate to Functions
2. Upgrade to Blaze plan (pay-as-you-go)
3. Set up budget alerts

### 3. Deploy Security Rules

**Firestore Rules** (`firestore.rules`):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isVerified() {
      return request.auth.token.email_verified == true;
    }
    
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    
    function hasRole(role) {
      return isAuthenticated() && isVerified() && getUserRole() == role;
    }
    
    function isOwnerOrAdmin(userId) {
      return isAuthenticated() && 
             (request.auth.uid == userId || 
              getUserRole() in ['ADMIN', 'DISTRICT_SUPER_ADMIN']);
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated() && isVerified();
      allow create: if isAuthenticated();
      allow update: if isOwnerOrAdmin(userId);
      allow delete: if hasRole('ADMIN');
    }
    
    // Devices collection
    match /devices/{deviceId} {
      allow read: if isAuthenticated() && isVerified();
      allow create: if hasRole('ADMIN') || hasRole('MANUFACTURER') || hasRole('LM_OFFICER');
      allow update: if hasRole('ADMIN') || hasRole('DISTRICT_SUPER_ADMIN') || hasRole('LM_OFFICER');
      allow delete: if hasRole('ADMIN');
    }
    
    // Tamper logs
    match /tamper_logs/{logId} {
      allow read: if isAuthenticated() && isVerified();
      allow create: if isAuthenticated();
      allow update, delete: if hasRole('ADMIN');
    }
    
    // Block everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Deploy rules:**
```bash
firebase deploy --only firestore:rules
```

### 4. Create Firestore Indexes

Create `firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "devices",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "lastSeen", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "devices",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "district", "order": "ASCENDING" },
        { "fieldPath": "tampered", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "tamper_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "deviceId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "role", "order": "ASCENDING" },
        { "fieldPath": "district", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

**Deploy indexes:**
```bash
firebase deploy --only firestore:indexes
```

---

## ⚙️ Environment Configuration

### 1. Create Production `.env`

**DO NOT commit this file!**

```env
# Production Environment Variables
VITE_APP_ENV=production

# Firebase Production Project
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=tamperguard-production.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tamperguard-production
VITE_FIREBASE_STORAGE_BUCKET=tamperguard-production.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# MQTT Production Broker (authenticated)
VITE_MQTT_BROKER_URL=wss://your-production-broker.com:8883/mqtt
VITE_MQTT_TOPIC_DATA=tamper/esp32/data
VITE_MQTT_TOPIC_CMD=tamper/esp32/cmd
VITE_MQTT_USERNAME=production_user
VITE_MQTT_PASSWORD=secure_password_here

# EmailJS
VITE_EMAILJS_SERVICE_ID=service_xxxxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxx
VITE_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxxx

# Feature Flags (production)
VITE_FEATURE_BLOCKCHAIN_DASHBOARD=true
VITE_FEATURE_DEVICE_AUTO_LOCK=true
VITE_FEATURE_PWA_ENABLED=true
VITE_FEATURE_DARK_MODE=true

# Debug (OFF in production)
VITE_DEBUG_MODE=false
VITE_USE_MOCK_DATA=false

# Security
VITE_SESSION_TIMEOUT=3600000
VITE_MAX_LOGIN_ATTEMPTS=5
VITE_PASSWORD_MIN_LENGTH=8

# Analytics
VITE_GA_TRACKING_ID=UA-XXXXXXXXX-X
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

### 2. Firebase Hosting Configuration

Update `firebase.json`:
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          }
        ]
      },
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|ico)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(js|css|woff|woff2)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs18",
    "ignore": ["node_modules", ".git"]
  }
}
```

---

## 🚀 Build & Deploy

### 1. Build Production Bundle

```bash
# Clean previous builds
rm -rf dist/

# Install dependencies (clean install)
npm ci

# Run production build
npm run build

# Verify build output
ls -lh dist/

# Check bundle size
du -sh dist/
# Should be < 2MB for dist/ folder
```

**Verify Build:**
```bash
# Test production build locally
npm run preview

# Open http://localhost:4173
# Test all critical features
```

### 2. Deploy to Firebase

**First Time Setup:**
```bash
# Initialize Firebase in project
firebase init

# Select:
# - Hosting
# - Firestore
# - Functions (if using)

# Public directory: dist
# Single-page app: Yes
# GitHub deploys: No (for now)

# Select existing project
firebase use --add

# Alias: production
# Select: tamperguard-production
```

**Deploy All:**
```bash
# Deploy everything
firebase deploy

# This deploys:
# - Hosting (your app)
# - Firestore rules
# - Firestore indexes
# - Cloud Functions (if any)
```

**Deploy Hosting Only:**
```bash
firebase deploy --only hosting
```

**Deploy with Message:**
```bash
firebase deploy -m "v1.0.0 - Initial production release"
```

### 3. Verify Deployment

After deployment, verify:

```bash
# Get hosting URL
firebase hosting:sites:list

# Example: https://tamperguard-production.web.app
```

**Manual Testing:**
1. Open production URL
2. Test registration flow
3. Test login
4. Test device monitoring
5. Test MQTT connection
6. Test tamper alerts
7. Test dark mode
8. Test PWA installation
9. Test on mobile device

---

## 🔍 Post-Deployment

### 1. Monitoring Setup

**Firebase Performance Monitoring:**
```bash
# Enable in Firebase Console
# Navigate to Performance → Get started
```

**Error Tracking (Sentry):**
```bash
npm install @sentry/react
```

```javascript
// src/main.jsx
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_APP_ENV,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // Filter out sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    }
  });
}
```

**Uptime Monitoring:**
- Use UptimeRobot (free): https://uptimerobot.com/
- Monitor: https://tamperguard-production.web.app
- Alert via: Email, SMS, Slack

### 2. Analytics Verification

**Google Analytics:**
```bash
# Verify events in Google Analytics
# Real-time reports should show activity
```

**Firebase Analytics:**
```bash
# Check Firebase Console → Analytics
# Events should appear within 24 hours
```

### 3. Backup Database

```bash
# Export Firestore data (first time)
gcloud firestore export gs://tamperguard-production-backup/$(date +%Y-%m-%d)

# Or use Firebase Console:
# Firestore → Import/Export → Export
```

**Automate Backups:**
```javascript
// Cloud Function to backup daily
const functions = require('firebase-functions');
const firestore = require('@google-cloud/firestore');

exports.scheduledFirestoreExport = functions.pubsub
  .schedule('every 24 hours')
  .onRun((context) => {
    const client = new firestore.v1.FirestoreAdminClient();
    const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
    const databaseName = client.databasePath(projectId, '(default)');

    return client.exportDocuments({
      name: databaseName,
      outputUriPrefix: `gs://${projectId}-backup`,
      collectionIds: []
    })
    .then(() => console.log('Export started'))
    .catch(err => console.error('Export failed:', err));
  });
```

### 4. Set Up Alerts

**Budget Alerts (Firebase Console):**
1. Project Settings → Usage and billing
2. Set budget alert (e.g., $50/month)
3. Add notification email

**Error Rate Alerts (Cloud Monitoring):**
1. GCP Console → Monitoring → Alerting
2. Create alert policy
3. Condition: Error rate > 5% for 5 minutes
4. Notification: Email, SMS, PagerDuty

---

## 🔄 Rollback Procedure

If deployment has issues:

### 1. Rollback Hosting

```bash
# List previous versions
firebase hosting:releases:list

# Rollback to previous version
firebase hosting:rollback

# Or deploy specific version
firebase hosting:clone SOURCE_SITE:VERSION DESTINATION_SITE
```

### 2. Rollback Firestore Rules

```bash
# Firestore rules are versioned
# In Firebase Console:
# Firestore → Rules → History
# Select previous version → Publish
```

### 3. Quick Fix Deploy

```bash
# Make fix
git checkout hotfix-branch

# Build and deploy
npm run build
firebase deploy --only hosting

# Tag version
git tag v1.0.1-hotfix
git push origin v1.0.1-hotfix
```

---

## 🔧 Maintenance

### Weekly Tasks

- [ ] Review error logs (Sentry)
- [ ] Check Firebase quota usage
- [ ] Review MQTT connection stability
- [ ] Check for security updates
- [ ] Monitor uptime reports

### Monthly Tasks

- [ ] Update dependencies
  ```bash
  npm outdated
  npm update
  npm audit fix
  ```
- [ ] Review analytics
- [ ] Database cleanup (old logs)
- [ ] Backup verification
- [ ] Performance audit
  ```bash
  npm run build
  npm install -g lighthouse
  lighthouse https://your-app.web.app
  ```

### Quarterly Tasks

- [ ] Security audit
- [ ] Load testing
- [ ] User feedback review
- [ ] Documentation update
- [ ] Feature planning

---

## 📊 Performance Optimization

### Bundle Size Optimization

```bash
# Analyze bundle
npm run build -- --report

# Or use webpack-bundle-analyzer
npm install -D webpack-bundle-analyzer
```

**Code Splitting:**
```javascript
// Lazy load routes
const BlockchainDashboard = lazy(() => 
  import('./components/BlockchainDashboard')
);

<Suspense fallback={<Loading />}>
  <BlockchainDashboard />
</Suspense>
```

### Image Optimization

```bash
# Install image optimizer
npm install -D imagemin imagemin-webp

# Convert to WebP
# Use online tools or build script
```

### Database Optimization

**Firestore Query Optimization:**
- Add indexes for frequent queries
- Use query limits
- Implement pagination
- Cache frequently accessed data

```javascript
// Good: With limit
const q = query(
  collection(db, 'devices'),
  where('status', '==', 'ACTIVE'),
  orderBy('lastSeen', 'desc'),
  limit(50)
);

// Bad: No limit
const q = query(
  collection(db, 'devices'),
  where('status', '==', 'ACTIVE'),
  orderBy('lastSeen', 'desc')
);
```

---

## 🆘 Common Deployment Issues

### Issue: "Firebase deploy" fails

**Solution:**
```bash
# Clear Firebase cache
firebase logout
firebase login
firebase use production
firebase deploy
```

### Issue: Build size too large

**Solution:**
```bash
# Remove unused dependencies
npm prune

# Check for large packages
npx npm-bundle-size

# Use production builds of libraries
```

### Issue: CORS errors after deployment

**Solution:**
- Verify Firebase Hosting rewrites
- Check MQTT broker CORS settings
- Add domain to Firebase authorized domains

### Issue: Environment variables not working

**Solution:**
```bash
# Ensure .env is not in .gitignore root
# Ensure VITE_ prefix for all client vars
# Rebuild after changing .env
npm run build
```

---

## 📞 Support

**Deployment Issues:**
- Firebase Support: https://firebase.google.com/support
- GitHub Issues: https://github.com/yourusername/tamperguard/issues
- Email: devops@tamperguard.com

---

## ✅ Post-Deployment Checklist

After successful deployment:

- [ ] App loads on production URL  
- [ ] User registration works
- [ ] Login/logout works
- [ ] Email verification sent
- [ ] Device data loads
- [ ] MQTT connection established
- [ ] Tamper alerts triggering
- [ ] Device locking works (if applicable)
- [ ] Dark mode works
- [ ] Mobile responsive
- [ ] PWA installable
- [ ] All navigation links work
- [ ] No console errors
- [ ] Analytics tracking
- [ ] Error monitoring active
- [ ] Backup scheduled
- [ ] Monitoring alerts configured
- [ ] Team notified of launch
- [ ] Documentation updated

---

**Congratulations! 🎉 Your app is live!**

Monitor closely for the first 24-48 hours and be ready to respond to issues.

---

**Last Updated**: March 12, 2026  
**Version**: 1.0
