# Production Readiness Checklist

Use this checklist before deploying TamperGuard to production.

## ✅ Security

### Authentication & Authorization
- [ ] Email verification is enforced for all users
- [ ] Strong password requirements enabled (min 8 chars, complexity)
- [ ] Firebase Authentication configured with proper security settings
- [ ] Role-based access control (RBAC) implemented and tested
- [ ] Session timeout configured appropriately
- [ ] Account lockout after failed login attempts

### Environment Variables
- [ ] All sensitive credentials stored in environment variables
- [ ] `.env` file is in `.gitignore` (never committed)
- [ ] Production `.env` uses different Firebase project than dev
- [ ] API keys rotated and secured
- [ ] Firebase Admin SDK credentials secured (server-side only)

### Firebase Security Rules
- [ ] Firestore security rules reviewed and tested
- [ ] Rules prevent unauthorized data access
- [ ] Rules validated using Firebase Emulator
- [ ] Authentication required for all sensitive operations
- [ ] Rate limiting implemented on Cloud Functions

```javascript
// Example production-ready Firestore rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function hasRole(role) {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
      allow delete: if hasRole('ADMIN');
    }
    
    // Devices collection
    match /devices/{deviceId} {
      allow read: if isAuthenticated();
      allow create: if hasRole('ADMIN') || hasRole('MANUFACTURER');
      allow update: if hasRole('ADMIN') || hasRole('DISTRICT_SUPER_ADMIN');
      allow delete: if hasRole('ADMIN');
    }
    
    // Tamper logs
    match /tamper_logs/{logId} {
      allow read: if isAuthenticated();
      allow write: if hasRole('ADMIN') || hasRole('LM_OFFICER');
    }
  }
}
```

### MQTT Security
- [ ] Using authenticated MQTT broker (not public HiveMQ)
- [ ] TLS/SSL encryption enabled (wss://)
- [ ] Username/password authentication configured
- [ ] Client certificates implemented (optional but recommended)
- [ ] Topic-level ACLs configured
- [ ] QoS settings optimized for reliability

**Recommended: Switch to authenticated broker**
```javascript
// Production MQTT configuration
const client = mqtt.connect('wss://your-broker.com:8883/mqtt', {
  username: process.env.VITE_MQTT_USERNAME,
  password: process.env.VITE_MQTT_PASSWORD,
  clientId: `client_${userId}_${Date.now()}`,
  clean: false, // Persistent sessions
  keepalive: 60,
  reconnectPeriod: 5000,
  rejectUnauthorized: true, // Verify SSL certs
});
```

## 🔐 Data Privacy & Compliance

- [ ] Privacy policy created and displayed
- [ ] Terms of service created and displayed
- [ ] GDPR compliance (if applicable)
- [ ] User consent obtained for data collection
- [ ] Data retention policy implemented
- [ ] User data export functionality (GDPR requirement)
- [ ] User data deletion functionality (GDPR requirement)
- [ ] Audit logs for sensitive operations
- [ ] PII (Personally Identifiable Information) encrypted

## ⚡ Performance Optimization

### Frontend
- [ ] Production build tested (`npm run build`)
- [ ] Bundle size optimized (< 500KB gzipped)
- [ ] Code splitting implemented for large routes
- [ ] Images optimized and lazy-loaded
- [ ] Unused dependencies removed
- [ ] Tree shaking enabled
- [ ] Critical CSS inlined
- [ ] Service worker registered for offline support

**Check bundle size:**
```bash
npm run build
# Check dist/ folder size
du -sh dist/
```

### Backend
- [ ] Database indexes created for frequent queries
- [ ] Firestore query limits set
- [ ] Pagination implemented for large lists
- [ ] Caching strategy implemented (Redis/Firebase Realtime DB)
- [ ] Cloud Functions optimized (cold start, memory)
- [ ] Rate limiting on API endpoints

**Firestore Index Examples:**
```javascript
// Create indexes for:
// 1. devices WHERE status == 'tampered' ORDER BY lastSeen DESC
// 2. tamper_logs WHERE deviceId == 'xxx' ORDER BY timestamp DESC
// 3. users WHERE district == 'xxx' AND role == 'USER'
```

### MQTT
- [ ] QoS level configured (0 for speed, 1 for reliability)
- [ ] Clean session settings optimized
- [ ] Message throttling implemented
- [ ] Reconnection logic robust
- [ ] Connection pooling for multiple clients

## 🧪 Testing

- [ ] Manual testing completed on all major features
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive testing (iOS, Android)
- [ ] PWA installation tested
- [ ] Offline functionality verified
- [ ] MQTT connection/disconnection scenarios tested
- [ ] Role-based access tested for all roles
- [ ] Error handling tested (network failures, invalid data)
- [ ] Load testing performed (high concurrent users)
- [ ] Security testing (penetration testing recommended)

**Testing Checklist:**
```
✓ User Registration & Email Verification
✓ Login/Logout Flow
✓ Password Reset
✓ Device Registration
✓ Device Monitoring Dashboard
✓ Tamper Alert Triggering
✓ Device Auto-Lock
✓ Manual Device Unlock (District Super Admin)
✓ Notification System
✓ Search & Filter Functions
✓ Dark Mode Toggle
✓ Map View
✓ Profile Management
✓ Settings Page
✓ PWA Installation
✓ Offline Mode
✓ MQTT Connection/Reconnection
✓ All User Roles Access
```

## 📱 Mobile & PWA

- [ ] Capacitor configured and tested
- [ ] Android APK built and tested
- [ ] App icons generated (all sizes)
- [ ] Splash screens created
- [ ] PWA manifest configured
- [ ] Service worker configured
- [ ] Offline fallback page created
- [ ] Add to home screen tested
- [ ] Push notifications configured (optional)

**Generate icons:**
```bash
# Use https://realfavicongenerator.net/
# Or manually create icons for:
# 192x192, 512x512, maskable icons
```

## 🌐 Deployment

### Firebase Hosting
- [ ] Firebase project created (production)
- [ ] Firebase CLI installed and authenticated
- [ ] Hosting configured in `firebase.json`
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] CDN caching configured
- [ ] Redirects and rewrites configured

**Deploy command:**
```bash
# Build
npm run build

# Deploy
firebase deploy --only hosting

# Or deploy everything
firebase deploy
```

### Environment Configuration
- [ ] Production environment variables set
- [ ] Different Firebase projects for dev/staging/prod
- [ ] Feature flags configured per environment
- [ ] Analytics enabled (Google Analytics, Firebase Analytics)
- [ ] Error tracking configured (Sentry recommended)
- [ ] Logging configured (structured logging)

### DNS & Domain
- [ ] Custom domain purchased (optional)
- [ ] DNS records configured
- [ ] SSL certificate issued
- [ ] www redirect configured
- [ ] HTTPS enforced

## 📊 Monitoring & Analytics

- [ ] Google Analytics integrated
- [ ] Firebase Analytics configured
- [ ] Error tracking enabled (Sentry/Bugsnag)
- [ ] Performance monitoring enabled
- [ ] Uptime monitoring configured (UptimeRobot/Pingdom)
- [ ] Cloud Functions logging reviewed
- [ ] Database usage metrics monitored
- [ ] MQTT connection metrics tracked

**Set up Sentry (recommended):**
```bash
npm install @sentry/react
```

```javascript
// src/main.jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_APP_ENV,
  tracesSampleRate: 1.0,
});
```

## 🔄 CI/CD

- [ ] GitHub Actions configured (or GitLab CI, etc.)
- [ ] Automated testing on PR
- [ ] Automated builds on merge to main
- [ ] Automated deployment to staging
- [ ] Manual approval for production deployment
- [ ] Version tagging automated
- [ ] Changelog generated automatically

**Example GitHub Action:**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Firebase

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: your-project-id
```

## 📚 Documentation

- [ ] README.md complete and accurate
- [ ] LICENSE file added
- [ ] .env.example up-to-date
- [ ] API documentation created (if applicable)
- [ ] IoT setup guide created
- [ ] User manual created
- [ ] Admin guide created
- [ ] Troubleshooting guide created
- [ ] Changelog maintained

## 🔧 Maintenance

- [ ] Backup strategy implemented
- [ ] Database backup scheduled
- [ ] Rollback procedure documented
- [ ] Incident response plan created
- [ ] On-call rotation established (for 24/7 systems)
- [ ] Support email/system configured
- [ ] Bug tracking system configured (GitHub Issues)

## 📋 Legal & Compliance

- [ ] Privacy Policy reviewed by legal team
- [ ] Terms of Service reviewed
- [ ] Data protection compliance verified
- [ ] User consent mechanisms in place
- [ ] Cookie policy (if using cookies)
- [ ] Disclaimer about measurement accuracy
- [ ] License file included (MIT License)

## 🚀 Launch Checklist

**Day Before Launch:**
- [ ] Full backup of database
- [ ] Test restore procedure
- [ ] Verify all monitoring alerts working
- [ ] Review error logs (should be clean)
- [ ] Test all critical user flows
- [ ] Verify email delivery working
- [ ] Check MQTT broker status
- [ ] Review security rules one last time
- [ ] Prepare rollback plan

**Launch Day:**
- [ ] Deploy to production
- [ ] Verify deployment successful
- [ ] Test critical flows in production
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Check MQTT connections
- [ ] Verify email notifications
- [ ] Test from multiple devices
- [ ] Announce launch (if applicable)
- [ ] Monitor user feedback

**Post-Launch (First Week):**
- [ ] Daily monitoring of errors and performance
- [ ] Gather user feedback
- [ ] Fix critical bugs immediately
- [ ] Plan first patch release
- [ ] Document lessons learned
- [ ] Update documentation based on feedback

---

## 🎯 Production Readiness Score

**Calculate your score:**
- **Security**: 40 points
- **Performance**: 20 points
- **Testing**: 15 points
- **Deployment**: 10 points
- **Monitoring**: 10 points
- **Documentation**: 5 points

**Scoring:**
- **90-100**: Production ready! 🚀
- **75-89**: Nearly there, address critical items
- **60-74**: Significant work needed
- **Below 60**: Not ready for production

---

## 🆘 Common Issues & Solutions

### Issue: Firebase Functions timeout
**Solution:** Increase timeout and memory allocation
```json
// firebase.json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs18",
    "timeout": "60s",
    "memory": "1GB"
  }
}
```

### Issue: MQTT disconnects frequently
**Solution:** Implement exponential backoff reconnection
```javascript
const reconnectStrateg y = {
  initialDelay: 1000,
  maxDelay: 60000,
  factor: 2,
  jitter: true
};
```

### Issue: Large bundle size
**Solution:** Use code splitting and lazy loading
```javascript
const BlockchainDashboard = lazy(() => 
  import('./components/BlockchainDashboard')
);
```

### Issue: Firestore costs high
**Solution:** Implement caching and optimize queries
- Cache frequently accessed data
- Use Firestore query limits
- Implement pagination
- Use Firestore Realtime Database for high-frequency updates

---

## 📞 Support Resources

- **Firebase Support**: https://firebase.google.com/support
- **React Documentation**: https://react.dev/
- **Capacitor Docs**: https://capacitorjs.com/docs
- **MQTT.js Docs**: https://github.com/mqttjs/MQTT.js

---

**Last Updated:** March 12, 2026
**Version:** 1.0.0
