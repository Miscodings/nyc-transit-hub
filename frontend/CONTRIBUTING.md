# Contributing to NYC Transit Hub

Thank you for your interest in contributing! This document provides guidelines and instructions.

## How to Contribute

### Reporting Bugs
1. Check [existing issues](https://github.com/yourusername/lcbc-transit_hub/issues) to avoid duplicates
2. Open a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs. actual behavior
   - Screenshots if applicable
   - Environment info (OS, browser, versions)

### Suggesting Features
1. Check [discussions](https://github.com/yourusername/lcbc-transit_hub/discussions) first
2. Describe the feature and use case
3. Include examples if helpful

### Submitting Code

1. **Fork and clone**
   ```bash
   git clone https://github.com/yourusername/lcbc-transit_hub.git
   git checkout -b feature/your-feature-name
   ```

2. **Set up development environment**
   ```bash
   # Frontend
   cd frontend
   npm install
   npm run dev
   
   # Backend (in another terminal)
   cd backend
   python -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   pip install -r requirements.txt
   python app.py
   ```

3. **Make your changes**
   - Keep commits atomic and descriptive
   - Follow the existing code style
   - Add comments for complex logic
   - Test your changes locally

4. **Commit and push**
   ```bash
   git add .
   git commit -m "Add feature: description"
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request**
   - Reference any related issues
   - Describe what you changed and why
   - Include screenshots for UI changes
   - Ensure CI checks pass

## Development Guidelines

### Frontend (React/Vite)
- Use functional components with hooks
- Use Tailwind CSS for styling; add `dark:` variants for dark mode support
- Keep components focused and reusable
- Add translations for new UI strings (en, es, zh)
- Test in both light and dark modes

### Backend (Flask/Python)
- Follow PEP 8 style guide
- Add docstrings to functions
- Use type hints where possible
- Test endpoints with `verify_mta_data.py` or pytest
- Keep database changes backwards-compatible

### General
- Don't commit build artifacts, node_modules, or .db files
- Update README if adding features
- Keep dependencies up to date
- Write meaningful commit messages

## Code Style

### JavaScript/React
```javascript
// Use const/let, not var
const myVariable = 'value';

// Arrow functions
const handleClick = () => { /* ... */ };

// Meaningful names
const isServiceGood = status === 'good';
```

### Python
```python
# Follow PEP 8
def get_service_status():
    """Fetch and return current service status."""
    # Implementation
    pass

# Use type hints
def fetch_feed(url: str) -> FeedMessage:
    pass
```

## Testing

### Frontend
```bash
cd frontend
npm run build  # Check for build errors
```

### Backend
```bash
cd backend
python verify_mta_data.py  # Test MTA feed connectivity
python -m pytest tests/    # Run unit tests
```

## Commit Message Format

```
[type]: Short description (50 chars max)

Longer explanation if needed (70 chars per line).
Explain what and why, not how.

Fixes #123
Related to #456
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:
```
feat: Add real-time vehicle positions to map

Parse vehicle position feed from MTA GTFS-RT and display
on the interactive map with live updates every 30 seconds.

Fixes #45
```

## Questions?

- Open an [issue](https://github.com/yourusername/lcbc-transit_hub/issues) with tag `question`
- Join discussions in the GitHub Discussions tab
- Check existing documentation in README.md

Thank you for helping improve NYC Transit Hub! 🚇
