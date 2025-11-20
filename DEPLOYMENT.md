# Deployment Guide - Vercel

## ✅ Setup Complete

Your project is now linked to Vercel:
- **Project**: `orchardprogram`
- **Account**: `rodolfodavidalvarez`
- **Vercel Dashboard**: https://vercel.com/rodolfo-alvarezs-projects-5c561a46/orchardprogram

## Manual Deployment Commands

### Deploy to Production
```bash
npm run deploy
```
or
```bash
vercel --prod
```

This deploys to: https://orchardprogram.vercel.app (or your custom domain)

### Deploy Preview (for testing)
```bash
npm run deploy:preview
```
or
```bash
vercel
```

This creates a preview deployment URL for testing before going live.

## What Gets Deployed

- ✅ Express server (`server.js`)
- ✅ HTML preview (`Document Preview/playbook-preview.html`)
- ✅ All assets (logo, CSS, JS)
- ✅ Error handling
- ✅ PDF export functionality

## Deployment Process

1. **Make changes** to your code
2. **Test locally**: `npm run dev`
3. **Deploy preview**: `npm run deploy:preview` (optional)
4. **Deploy production**: `npm run deploy`

## Environment Variables

No environment variables needed for basic deployment.

## Custom Domain

To add a custom domain:
1. Go to Vercel Dashboard → Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions

## Troubleshooting

### Check deployment status
```bash
vercel ls
```

### View deployment logs
```bash
vercel logs
```

### Unlink and re-link project
```bash
rm -rf .vercel
vercel link --project=orchardprogram
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run deploy` | Deploy to production |
| `npm run deploy:preview` | Create preview deployment |
| `vercel ls` | List all deployments |
| `vercel logs` | View deployment logs |
| `vercel open` | Open project in dashboard |

---

**Ready to deploy?** Run `npm run deploy` to push to production! 🚀

