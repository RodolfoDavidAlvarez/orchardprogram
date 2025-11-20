# Deployment Guide

## Quick Deploy Options

### Option 1: Vercel (Recommended - Easiest)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts - it will automatically detect the configuration

### Option 2: Netlify

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Deploy:
```bash
netlify deploy --prod
```

### Option 3: Heroku

1. Install Heroku CLI
2. Create Heroku app:
```bash
heroku create orchards-playbook
```

3. Deploy:
```bash
git push heroku main
```

### Option 4: Local Development

```bash
npm run dev
```

Server will run on http://localhost:8080 with auto-reload on file changes.

## Environment Variables

No environment variables required for basic deployment.

## Production Build

The app is ready to deploy as-is. No build step required.

## Testing PDF Export

1. Open the app in browser
2. Click "📄 Export to PDF" button
3. Check browser console for any errors
4. Errors are automatically logged to server console

## Share with Your Boss

Once deployed, you'll get a URL like:
- Vercel: `https://orchards-program.vercel.app`
- Netlify: `https://orchards-program.netlify.app`
- Heroku: `https://orchards-playbook.herokuapp.com`

Share this URL - no installation needed!

