# Contributing to TamperGuard

First off, thank you for considering contributing to TamperGuard! 🎉

It's people like you that make TamperGuard such a great tool for ensuring measurement accuracy and consumer protection.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Issue Guidelines](#issue-guidelines)

---

## Code of Conduct

This project and everyone participating in it is governed by our commitment to fostering an open and welcoming environment. By participating, you are expected to uphold this code:

- **Be respectful** - Different viewpoints and experiences are valued
- **Be collaborative** - Work together towards the best solution
- **Be inclusive** - Welcome newcomers and help them get started
- **Be professional** - Focus on what is best for the community
- **Be patient** - Remember that we're all learning

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

**Template:**
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g. Windows 11, macOS 13]
- Browser: [e.g. Chrome 118, Firefox 119]
- App Version: [e.g. 1.0.0]
- Device: [e.g. ESP32, Arduino Uno]

**Additional context**
Any other context about the problem.
```

### 💡 Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful** to most users
- **List any alternatives** you've considered
- **Include mockups or examples** if applicable

### 🔧 Code Contributions

#### Areas We Need Help With

- **Frontend Development**: React components, UI/UX improvements, accessibility
- **Backend Development**: Firebase functions, API endpoints, database optimization
- **IoT Integration**: ESP32/Arduino sketches, sensor calibration, MQTT optimization
- **Testing**: Unit tests, integration tests, E2E tests
- **Documentation**: Tutorials, API docs, code comments
- **Localization**: Translating UI to Hindi, Tamil, and other Indian languages
- **DevOps**: CI/CD pipelines, deployment automation, monitoring

## Development Setup

### Prerequisites

- Node.js >= 18.x
- npm or yarn
- Git
- Firebase CLI
- (Optional) Android Studio for mobile development

### Step-by-Step Setup

1. **Fork the repository**
   
   Click the "Fork" button at the top right of the repository page.

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/tamperguard.git
   cd tamperguard
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/tamperguard.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

5. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase credentials
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Run tests (when available)**
   ```bash
   npm test
   ```

### Working with MQTT (Development)

For local MQTT broker testing:
```bash
# Using Docker
docker run -d -p 1883:1883 -p 9001:9001 eclipse-mosquitto

# Or use online broker (already configured)
# Default: wss://broker.hivemq.com:8884/mqtt
```

## Pull Request Process

### Before Submitting

- [ ] Code follows the project's coding standards
- [ ] Self-review of code completed
- [ ] Comments added for complex logic
- [ ] Documentation updated (if needed)
- [ ] No new warnings or errors introduced
- [ ] Tests pass locally
- [ ] Branch is up-to-date with main branch

### Submitting a Pull Request

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**
   - Write clear, readable code
   - Follow existing code style
   - Add comments for complex logic

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```
   See [Commit Message Guidelines](#commit-message-guidelines) below.

4. **Keep your branch updated**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill out the PR template
   - Link related issues

### Pull Request Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Closes #123

## Testing
- [ ] Tested locally
- [ ] Added unit tests
- [ ] Manual testing performed

## Screenshots (if applicable)
Add screenshots showing the changes.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No new warnings
- [ ] Added tests
- [ ] All tests pass
```

## Coding Standards

### JavaScript/React Style Guide

**General Principles:**
- Use functional components with hooks
- Keep components small and focused (< 200 lines)
- Use meaningful variable and function names
- Avoid deep nesting (max 3 levels)

**Example:**
```javascript
// ✅ Good
const DeviceCard = ({ device, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleClick = () => {
    setIsExpanded(!isExpanded);
    onSelect(device.id);
  };
  
  return (
    <div className="device-card" onClick={handleClick}>
      <h3>{device.name}</h3>
      {isExpanded && <DeviceDetails device={device} />}
    </div>
  );
};

// ❌ Bad
const dc = ({ d, os }) => {
  const [ie, sie] = useState(false);
  return <div onClick={() => { sie(!ie); os(d.id); }}><h3>{d.name}</h3></div>;
};
```

**Hooks:**
- Use custom hooks for reusable logic
- Name custom hooks with `use` prefix
- Extract complex logic from components

```javascript
// Custom hook example
const useDeviceStatus = (deviceId) => {
  const [status, setStatus] = useState('idle');
  
  useEffect(() => {
    const listener = subscribeToDevice(deviceId, setStatus);
    return () => listener.unsubscribe();
  }, [deviceId]);
  
  return status;
};
```

**File Organization:**
```
src/components/
  ├── DeviceCard/
  │   ├── DeviceCard.jsx
  │   ├── DeviceCard.test.jsx
  │   └── DeviceCard.module.css (if needed)
  └── ...
```

### CSS/Tailwind Guidelines

- Use Tailwind utility classes first
- Extract repeated patterns into components
- Use dark mode classes: `dark:bg-slate-900`
- Follow mobile-first responsive design

```jsx
// ✅ Good
<div className="flex flex-col gap-4 sm:flex-row sm:gap-6 md:gap-8">
  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 rounded-lg">
    Submit
  </button>
</div>

// ❌ Avoid inline styles
<div style={{ display: 'flex', gap: '16px' }}>
  <button style={{ padding: '8px 16px', background: '#2563eb' }}>
    Submit
  </button>
</div>
```

### Firebase Best Practices

- Use transactions for critical updates
- Batch writes when updating multiple documents
- Add security rules for all collections
- Use emulators for local testing

```javascript
// ✅ Good - Batch write
const batch = writeBatch(db);
devices.forEach(device => {
  const ref = doc(db, 'devices', device.id);
  batch.update(ref, { status: 'active' });
});
await batch.commit();

// ❌ Bad - Multiple individual writes
devices.forEach(async device => {
  await updateDoc(doc(db, 'devices', device.id), { status: 'active' });
});
```

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, semicolons, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks (dependencies, build, etc.)
- **ci**: CI/CD changes

### Examples

```bash
# New feature
git commit -m "feat(dashboard): add device filtering by district"

# Bug fix
git commit -m "fix(mqtt): resolve connection timeout on slow networks"

# Documentation
git commit -m "docs(readme): update installation instructions"

# With body
git commit -m "feat(auth): implement email verification

- Add verification email template
- Create verification handler
- Update user status after verification

Closes #45"
```

## Issue Guidelines

### Creating Issues

Use issue templates when available:
- **Bug Report** - For reporting bugs
- **Feature Request** - For suggesting enhancements
- **Question** - For asking questions

### Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `priority: high` - High priority items
- `IoT` - IoT device related
- `frontend` - Frontend related
- `backend` - Backend related

## Development Tips

### Testing MQTT Locally

Use [MQTT Explorer](http://mqtt-explorer.com/) to debug:
1. Connect to `broker.hivemq.com:1883`
2. Subscribe to `tamper/esp32/#`
3. Publish test messages

### Debugging Firebase

```javascript
// Enable Firebase debug logging
import { setLogLevel } from 'firebase/firestore';
setLogLevel('debug');
```

### Hot Reload Issues

If hot reload isn't working:
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

## Questions?

- 💬 **Discord**: [Join our community](https://discord.gg/tamperguard)
- 📧 **Email**: dev@tamperguard.com
- 📖 **Docs**: [Full documentation](https://docs.tamperguard.com)

---

## Recognition

Contributors will be added to our [Contributors](https://github.com/yourusername/tamperguard/graphs/contributors) page and mentioned in release notes!

**Thank you for contributing to TamperGuard! 🙏**
