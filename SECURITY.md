# Security Policy

## 🔐 Security at TamperGuard

Security is a top priority for TamperGuard. We take the protection of user data and system integrity seriously. This document outlines our security practices and how to report vulnerabilities.

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅ Yes             |
| 0.1.x   | ❌ No (MVP only)   |

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability in TamperGuard, please report it responsibly:

### Where to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report via:
- **Email**: security@tamperguard.com (preferred)
- **GitHub Security Advisories**: [Report a vulnerability](https://github.com/yourusername/tamperguard/security/advisories/new)

### What to Include

When reporting a vulnerability, please include:

1. **Description** - Clear description of the vulnerability
2. **Impact** - Potential impact and severity assessment
3. **Steps to Reproduce** - Detailed steps to reproduce the issue
4. **Proof of Concept** - Code or screenshots demonstrating the issue
5. **Suggested Fix** - If you have a proposed solution (optional)
6. **Your Contact Info** - For follow-up questions

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: 
  - Critical: 1-7 days
  - High: 7-30 days
  - Medium: 30-90 days
  - Low: Next release cycle

### Disclosure Policy

We follow **Coordinated Vulnerability Disclosure**:
- Do not publicly disclose the vulnerability until we've issued a fix
- We'll credit you in the security advisory (unless you prefer anonymity)
- We may ask you to test the fix before public release

## 🛡️ Security Measures

### Current Implementation

#### Authentication & Authorization
- ✅ Firebase Authentication with email verification
- ✅ Role-based access control (RBAC)
- ✅ Secure password storage (Firebase handles hashing)
- ✅ Session management with automatic timeout
- ✅ Account lockout after failed login attempts

#### Data Protection
- ✅ Environment variables for sensitive data
- ✅ HTTPS enforcement in production
- ✅ Firestore security rules
- ✅ Input validation and sanitization
- ✅ XSS protection (React's built-in escaping)

#### Network Security
- ✅ Secure MQTT connections (WSS)
- ✅ CORS properly configured
- ✅ Content Security Policy (CSP) headers
- ✅ Firebase Hosting security features

#### Application Security
- ✅ No sensitive data in client-side code
- ✅ API keys properly scoped and restricted
- ✅ Regular dependency updates
- ✅ Code review for security issues

### Recommended Production Enhancements

#### For Production Deployment:

1. **MQTT Security**
   - [ ] Switch from public to authenticated MQTT broker
   - [ ] Implement client certificates
   - [ ] Enable ACL (Access Control Lists) at broker level
   - [ ] Use separate brokers for dev/prod

2. **Firebase Security**
   - [ ] Enable Firebase App Check
   - [ ] Implement rate limiting on Cloud Functions
   - [ ] Set up budget alerts to detect abuse
   - [ ] Regular security rules audit

3. **Monitoring & Logging**
   - [ ] Set up Sentry for error tracking
   - [ ] Enable Firebase Performance Monitoring
   - [ ] Log security events (failed logins, unauthorized access attempts)
   - [ ] Set up alerts for anomalies

4. **Infrastructure**
   - [ ] Web Application Firewall (WAF)
   - [ ] DDoS protection (Cloudflare recommended)
   - [ ] Regular security audits
   - [ ] Penetration testing

## 🔍 Known Security Considerations

### MQTT Broker

**Current**: Using public HiveMQ broker for demonstration
**Risk**: Anyone can subscribe to topics if they know the topic name
**Mitigation for Production**:
```javascript
// Use authenticated broker
const PRODUCTION_MQTT_CONFIG = {
  broker: 'wss://your-secure-broker.com:8883/mqtt',
  username: process.env.VITE_MQTT_USERNAME,
  password: process.env.VITE_MQTT_PASSWORD,
  clientId: `client_${userId}_${timestamp}`,
  ca: fs.readFileSync('path/to/ca.crt'), // Server cert
  cert: fs.readFileSync('path/to/client.crt'), // Client cert
  key: fs.readFileSync('path/to/client.key'), // Client key
  rejectUnauthorized: true
};
```

### API Keys in Client Code

**Current**: Firebase API keys exposed in client bundle (this is normal for Firebase)
**Risk**: Low - Firebase API keys are not secret, protected by Firebase security rules
**Note**: Firebase API keys are designed to be included in client code. Security comes from:
- Firebase security rules
- Firebase App Check (recommended for production)
- Domain restrictions in Firebase Console

**Additional Protection**:
- Enable Firebase App Check
- Restrict API keys to specific domains in Firebase Console
- Monitor usage for anomalies

### Firestore Security Rules

**Current**: Basic security rules
**Production Recommendation**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isVerified() {
      return request.auth.token.email_verified == true;
    }
    
    function hasRole(role) {
      return isAuthenticated() && 
             isVerified() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role;
    }
    
    function isOwnerOrAdmin(userId) {
      return isAuthenticated() && 
             (request.auth.uid == userId || hasRole('ADMIN'));
    }
    
    // Rate limiting (basic)
    function notTooManyRequests() {
      return request.time < resource.data.lastRequestTime + duration.fromSeconds(1);
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
      allow create: if hasRole('ADMIN') || hasRole('MANUFACTURER');
      allow update: if hasRole('ADMIN') || hasRole('DISTRICT_SUPER_ADMIN');
      allow delete: if hasRole('ADMIN');
    }
    
    // Tamper logs - write-heavy, read by authenticated users
    match /tamper_logs/{logId} {
      allow read: if isAuthenticated() && isVerified();
      allow create: if isAuthenticated(); // IoT devices write here
      allow update: if hasRole('ADMIN');
      allow delete: if hasRole('ADMIN');
    }
    
    // Prevent access to everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 🔐 Best Practices for Users

### For Administrators

1. **Use Strong Passwords**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Use a password manager

2. **Enable 2FA** (when available)
   - We plan to add 2FA in future releases

3. **Regular Security Audits**
   - Review user access logs monthly
   - Check for suspicious device activities
   - Audit tamper event logs

4. **Secure Device Credentials**
   - Don't share MQTT credentials
   - Rotate credentials every 90 days
   - Use different credentials for dev/prod

### For Developers

1. **Never Commit Secrets**
   - Always use `.env` for credentials
   - Check `.gitignore` before commits
   - Use `git-secrets` or similar tools

2. **Keep Dependencies Updated**
   ```bash
   npm audit
   npm audit fix
   ```

3. **Code Review**
   - Security-focused code review
   - Check for SQL injection (if using SQL)
   - Validate all user inputs

4. **Test Security Rules**
   ```bash
   firebase emulators:start
   # Run security rules unit tests
   ```

## 📚 Security Resources

### Documentation
- [Firebase Security](https://firebase.google.com/docs/rules)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MQTT Security](http://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html)
- [React Security Best Practices](https://react.dev/learn/security)

### Tools
- [npm audit](https://docs.npmjs.com/cli/v9/commands/npm-audit)
- [Snyk](https://snyk.io/)
- [OWASP ZAP](https://www.zaproxy.org/)
- [Firebase Emulator](https://firebase.google.com/docs/emulator-suite)

## 🏆 Security Hall of Fame

We recognize security researchers who help make TamperGuard more secure:

*No vulnerabilities reported yet - be the first!*

### Criteria for Recognition
- Report valid security vulnerability
- Follow responsible disclosure
- Provide clear reproduction steps
- Issue is confirmed and fixed

## 📞 Contact

**Security Team**: security@tamperguard.com

For non-security issues, use:
- General questions: support@tamperguard.com
- Bug reports: [GitHub Issues](https://github.com/yourusername/tamperguard/issues)

---

**Last Updated**: March 12, 2026  
**Version**: 1.0
