# Deployment and Hosting Guide

This system supports two primary hosting methods: **Vercel** (for full features including optimized proxying) and **GitHub Pages** (for free static hosting).

## 1. Hosting on Vercel (Recommended)
Vercel is the preferred hosting platform because it supports **Serverless Functions** (found in the `/api` directory). These functions act as a dedicated proxy for fetching Yahoo Finance data, which is more reliable than public proxies.

### Features:
- **Fast Data Fetching:** Uses the `/api/prices` endpoint.
- **Staging/Preview Deployments:** Every time you push a branch or create a Pull Request, Vercel automatically generates a unique "Preview URL". You can use this to test new features without affecting your main live site.
- **Continuous Deployment:** Merging to the `main` branch automatically updates your live site.

## 2. Hosting on GitHub Pages
GitHub Pages is excellent for a completely free, static hosting experience.

### Features:
- **Free:** No cost for hosting.
- **Auto-fallback:** Since GitHub Pages doesn't support the `/api` folder, the system automatically detects the environment and switches to using `allorigins.win` (a public CORS proxy) to fetch market data.
- **Setup:**
  1. Go to your Repository Settings.
  2. Select **Pages** from the sidebar.
  3. Set the source to **Deploy from a branch** and select `main` (root).

## 3. How to Test Changes Safely (Staging)
To avoid breaking your live journal:
1. **Create a new branch** for your experiments (e.g., `feature/new-charts`).
2. **Push the branch** to GitHub.
3. If using Vercel, check the **Deployments** tab in your Vercel dashboard to find the Preview URL for that branch.
4. Open the Preview URL to test. Your `localStorage` data (trades/funding) will typically be shared if the domain is the same, but you can always use the **Export JSON** and **Import JSON** buttons to move your data between staging and production.
5. Once you are satisfied, merge the branch into `main`.

## 4. Local Development
To run the app on your computer:
1. Open a terminal in the project folder.
2. Run: `python3 -m http.server 8000` (or use any static server).
3. Open `http://localhost:8000` in your browser.
4. The system will use the public proxy for data fetching while running locally.
