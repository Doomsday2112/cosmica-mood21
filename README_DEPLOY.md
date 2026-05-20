# Cosmica Mood Helper

This app is ready to deploy publicly on Vercel.

## Public URL

After deployment, use a name like:

- `https://cosmica-mood.vercel.app`
- `https://cosmica.vercel.app` if available
- a custom domain you buy, such as `cosmica.app`

Local URLs like `localhost` only work on your own computer. Friends need the deployed public URL.

## Environment variables

Add these in your hosting dashboard:

```text
OPENROUTER_API_KEY=your_private_key
OPENROUTER_MODEL=openai/gpt-4o-mini
PUBLIC_SITE_URL=https://your-public-site-url
```

Never put the API key in `script.js` or any browser file.
