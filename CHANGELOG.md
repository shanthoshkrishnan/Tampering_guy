# Changelog

All notable changes to TamperGuard will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Machine learning-based anomaly detection
- SMS alerts via Twilio integration
- PDF report generation for compliance
- Multi-language support (Hindi, Tamil, Bengali)
- iOS app version

## [1.0.0] - 2026-03-12

### Added
- **Authentication System**
  - Email/password authentication with Firebase
  - Email verification requirement
  - Password reset functionality
  - Role-based access control (USER, ADMIN, LM_OFFICER, DISTRICT_SUPER_ADMIN, MANUFACTURER)

- **Device Monitoring**
  - Real-time MQTT integration for IoT devices
  - Support for multiple device types (weighing machines, fuel dispensers, energy meters)
  - Live sensor data display (weight, voltage, magnetic field, tilt)
  - Device status tracking (Online, Offline, Tampered, Blocked)

- **Tamper Detection**
  - Automatic tamper detection from sensor data
  - Real-time alerts and notifications
  - Tamper event logging with timestamps
  - Toast notifications for immediate alerts
  - Notification bell with detailed tamper event list

- **Auto-Protection System**
  - Automatic device blocking when tampering detected
  - Electrical-level circuit interruption
  - Manual unlock capability (District Super Admin only)
  - Audit trail for all lock/unlock events

- **Dashboards**
  - User dashboard for personal device monitoring
  - Admin dashboard with district-wide overview
  - Manufacturer dashboard for fleet analytics
  - Blockchain dashboard for audit trails (LM Officers)
  - Statistical cards (Total devices, Active, Tampered, Transactions)

- **UI/UX Features**
  - Dark mode support with manual toggle
  - Fully responsive design (mobile-first)
  - Interactive map view with device locations
  - Search and filter functionality
  - Modal dialogs for detailed device information
  - Loading states and error handling

- **PWA & Mobile**
  - Progressive Web App with offline support
  - Service worker for caching
  - Install prompt for home screen
  - Android app via Capacitor
  - App icons and splash screens

- **Developer Experience**
  - Vite for fast development
  - Hot module replacement
  - Tailwind CSS for styling
  - React Hook Form for forms
  - Zod for validation

### Security
- Firebase Authentication integration
- Firestore security rules
- Environment variable management
- XSS and CSRF protection
- Secure MQTT connections (WSS)

### Infrastructure
- Firebase Hosting ready
- Cloud Firestore database
- Firebase Functions support
- MQTT broker integration (HiveMQ)
- Capacitor for native mobile

### Documentation
- Comprehensive README with project journey
- Production readiness checklist
- Environment variable examples

## [0.1.0] - 2025-12-10 (Hackathon MVP)

### Added
- Initial prototype with basic monitoring
- Mock data for demonstration
- Basic authentication
- Simple device listing
- Proof of concept MQTT integration

---

## Version History

- **1.0.0** - Production-ready release with full features
- **0.1.0** - Hackathon MVP and initial prototype

---

## Upgrade Guide

### From 0.1.0 to 1.0.0

**Breaking Changes:**
- MQTT topic structure changed from `device/data` to `tamper/esp32/data`
- User schema updated with new required fields
- Role constants changed to uppercase (e.g., `user` → `USER`)

**Migration Steps:**
1. Update IoT device firmware to publish to new MQTT topics
2. Run database migration script to update user documents
3. Update environment variables with new Firebase project
4. Clear browser cache and localStorage

**Database Migration:**
```javascript
// Run in Firebase Console or Cloud Function
const users = await getDocs(collection(db, 'users'));
users.forEach(async (doc) => {
  await updateDoc(doc.ref, {
    role: doc.data().role.toUpperCase(),
    updatedAt: new Date()
  });
});
```

---

## Support

For questions about changes or upgrades:
- **GitHub Issues**: https://github.com/yourusername/tamperguard/issues
- **Email**: support@tamperguard.com
- **Discord**: https://discord.gg/tamperguard
