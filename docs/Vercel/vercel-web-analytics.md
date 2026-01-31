---
sidebar_position: 1
---

# 📊 Getting Started with Vercel Web Analytics

This guide will help you get started with using Vercel Web Analytics on your project, showing you how to enable it, add the package to your project, deploy your app to Vercel, and view your data in the dashboard.

**Select your framework to view instructions on using the Vercel Web Analytics in your project**.

## Prerequisites

- ✅ A Vercel account. If you don't have one, you can [sign up for free](https://vercel.com/signup)
- ✅ A Vercel project. If you don't have one, you can [create a new project](https://vercel.com/new)
- ✅ The Vercel CLI installed. If you don't have it, you can install it using the following command:

<details>
<summary>Install Vercel CLI</summary>

**pnpm:**
```bash
pnpm i vercel
```

**yarn:**
```bash
yarn i vercel
```

**npm:**
```bash
npm i vercel
```

**bun:**
```bash
bun i vercel
```
</details>

## Configuration Steps

### Step 1: Enable Web Analytics in Vercel

On the [Vercel dashboard](https://vercel.com/dashboard), select your Project and then click the **Analytics** tab and click **Enable** from the dialog.

:::info
Enabling Web Analytics will add new routes (scoped at `/_vercel/insights/*`) after your next deployment.
:::

### Step 2: Add `@vercel/analytics` to your project

Using the package manager of your choice, add the `@vercel/analytics` package to your project:

<details>
<summary>Install @vercel/analytics</summary>

**pnpm:**
```bash
pnpm i @vercel/analytics
```

**yarn:**
```bash
yarn i @vercel/analytics
```

**npm:**
```bash
npm i @vercel/analytics
```

**bun:**
```bash
bun i @vercel/analytics
```
</details>

:::note
This step applies to: Next.js, SvelteKit, Remix, Create React App, Nuxt, Vue, Astro, and other frameworks.
:::

### Step 3: Add Analytics to Your Application

The implementation varies depending on your framework. Choose the option that matches your setup:

#### Next.js (Pages Directory)

The `Analytics` component is a wrapper around the tracking script, offering more seamless integration with Next.js, including route support.

Add the following code to your main app file:

**TypeScript (`pages/_app.tsx`):**
```tsx {2, 8}
import type { AppProps } from "next/app";
import { Analytics } from "@vercel/analytics/next";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}

export default MyApp;
```

**JavaScript (`pages/_app.js`):**
```jsx {1, 7}
import { Analytics } from "@vercel/analytics/next";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}

export default MyApp;
```

#### Next.js (App Directory)

The `Analytics` component is a wrapper around the tracking script, offering more seamless integration with Next.js, including route support.

Add the following code to the root layout:

**TypeScript (`app/layout.tsx`):**
```tsx {1, 15}
import { Analytics } from "@vercel/analytics/next";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Next.js</title>
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

**JavaScript (`app/layout.jsx`):**
```jsx {1, 11}
import { Analytics } from "@vercel/analytics/next";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Next.js</title>
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

#### Remix

The `Analytics` component is a wrapper around the tracking script, offering a seamless integration with Remix, including route detection.

Add the following code to your root file:

**TypeScript (`app/root.tsx`):**
```tsx {9, 21}
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { Analytics } from "@vercel/analytics/remix";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Analytics />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
```

**JavaScript (`app/root.jsx`):**
```jsx {9, 21}
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { Analytics } from "@vercel/analytics/remix";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Analytics />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
```

#### Nuxt

The `Analytics` component is a wrapper around the tracking script, offering more seamless integration with Nuxt, including route support.

Add the following code to your main component:

**TypeScript (`app.vue`):**
```vue {2,6}
<script setup lang="ts">
import { Analytics } from '@vercel/analytics/nuxt';
</script>

<template>
  <Analytics />
  <NuxtPage />
</template>
```

**JavaScript (`app.vue`):**
```vue {2,6}
<script setup>
import { Analytics } from '@vercel/analytics/nuxt';
</script>

<template>
  <Analytics />
  <NuxtPage />
</template>
```

#### SvelteKit

The `injectAnalytics` function is a wrapper around the tracking script, offering more seamless integration with SvelteKit, including route support.

Add the following code to the main layout:

**TypeScript (`src/routes/+layout.ts`):**
```ts
import { dev } from "$app/environment";
import { injectAnalytics } from "@vercel/analytics/sveltekit";

injectAnalytics({ mode: dev ? "development" : "production" });
```

**JavaScript (`src/routes/+layout.js`):**
```js
import { dev } from "$app/environment";
import { injectAnalytics } from "@vercel/analytics/sveltekit";

injectAnalytics({ mode: dev ? "development" : "production" });
```

#### Astro

The `Analytics` component is a wrapper around the tracking script, offering more seamless integration with Astro, including route support.

Add the following code to your base layout:

**TypeScript/JavaScript (`src/layouts/Base.astro`):**
```astro {2, 10}
---
import Analytics from '@vercel/analytics/astro';
{/* ... */}
---

<html lang="en">
	<head>
    <meta charset="utf-8" />
    <!-- ... -->
    <Analytics />
	</head>
	<body>
		<slot />
  </body>
</html>
```

:::note
The `Analytics` component is available in version `@vercel/analytics@1.4.0` and later.
If you are using an earlier version, you must configure the `webAnalytics` property of the Vercel adapter in your `astro.config.mjs` file as shown in the code below.
For further information, see the [Astro adapter documentation](https://docs.astro.build/en/guides/integrations-guide/vercel/#webanalytics).
:::

**Legacy configuration (`astro.config.mjs`):**
```js {7-9}
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel/serverless";

export default defineConfig({
  output: "server",
  adapter: vercel({
    webAnalytics: {
      enabled: true, // set to false when using @vercel/analytics@1.4.0
    },
  }),
});
```

#### Create React App

The `Analytics` component is a wrapper around the tracking script, offering more seamless integration with React.

:::warning
When using the plain React implementation, there is no route support.
:::

Add the following code to the main app file:

**TypeScript (`App.tsx`):**
```tsx {1, 7}
import { Analytics } from "@vercel/analytics/react";

export default function App() {
  return (
    <div>
      {/* ... */}
      <Analytics />
    </div>
  );
}
```

**JavaScript (`App.jsx`):**
```jsx {1, 7}
import { Analytics } from "@vercel/analytics/react";

export default function App() {
  return (
    <div>
      {/* ... */}
      <Analytics />
    </div>
  );
}
```

#### Vue

The `Analytics` component is a wrapper around the tracking script, offering more seamless integration with Vue.

:::info
Route support is automatically enabled if you're using `vue-router`.
:::

Add the following code to your main component:

**TypeScript (`src/App.vue`):**
```vue {2,6}
<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue';
</script>

<template>
  <Analytics />
  <!-- your content -->
</template>
```

**JavaScript (`src/App.vue`):**
```vue {2,6}
<script setup>
import { Analytics } from '@vercel/analytics/vue';
</script>

<template>
  <Analytics />
  <!-- your content -->
</template>
```

#### Plain HTML

For plain HTML sites, you can add the following script to your `.html` files:

```html
<script>
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
</script>
<script defer src="/_vercel/insights/script.js"></script>
```

:::info
When using the HTML implementation, there is no need to install the `@vercel/analytics` package. However, there is no route support.
:::

#### Other Frameworks

Import the `inject` function from the package, which will add the tracking script to your app. **This should only be called once in your app, and must run in the client**.

:::warning
There is no route support with the `inject` function.
:::

Add the following code to your main app file:

**TypeScript (`main.ts`):**
```ts
import { inject } from "@vercel/analytics";

inject();
```

**JavaScript (`main.js`):**
```js
import { inject } from "@vercel/analytics";

inject();
```

### Step 4: Deploy Your App to Vercel

Deploy your app using the following command:

```bash
vercel deploy
```

If you haven't already, we also recommend [connecting your project's Git repository](https://vercel.com/docs/git), which will enable Vercel to deploy your latest commits to main without terminal commands.

Once your app is deployed, it will start tracking visitors and page views.

## Verification

1. **Check the network requests:**
   
   If everything is set up properly, you should be able to see a Fetch/XHR request in your browser's Network tab from `/_vercel/insights/view` when you visit any page.

2. **View your data in the dashboard:**

   Once your app is deployed, and users have visited your site, you can view your data in the dashboard.
   
   To do so, go to your [dashboard](https://vercel.com/dashboard), select your project, and click the **Analytics** tab.

3. **Explore analytics panels:**

   After a few days of visitors, you'll be able to start exploring your data by viewing and [filtering](https://vercel.com/docs/analytics/filtering) the panels.

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Analytics not showing data | Component not installed correctly | Verify the Analytics component is imported and rendered in your app |
| Network request not appearing | Script not loaded | Check browser console for errors; ensure `/_vercel/insights/*` routes are accessible |
| Build errors after adding package | Version incompatibility | Ensure you're using a compatible version of @vercel/analytics for your framework |
| TypeScript errors | Missing types | Install `@types/node` or ensure TypeScript is properly configured |
| Data not updating | Caching issue | Clear browser cache; wait a few minutes for data to propagate |
| Wrong framework import | Using incorrect import path | Use framework-specific imports (e.g., `/next`, `/react`, `/vue`) |

## Advanced Features

### Custom Events

Users on Pro and Enterprise plans can add [custom events](https://vercel.com/docs/analytics/custom-events) to their data to track user interactions such as button clicks, form submissions, or purchases.

Example:
```typescript
import { track } from '@vercel/analytics';

// Track custom event
track('button_click', { button_name: 'signup' });
```

### Filtering Data

Learn how to [filter your analytics data](https://vercel.com/docs/analytics/filtering) to get insights specific to certain pages, devices, or user segments.

## Completion

✅ **Your app is now tracking analytics!**

**Next steps:**
- [Learn how to use the `@vercel/analytics` package](https://vercel.com/docs/analytics/package)
- [Learn how to set up custom events](https://vercel.com/docs/analytics/custom-events)
- [Learn about filtering data](https://vercel.com/docs/analytics/filtering)
- [Read about privacy and compliance](https://vercel.com/docs/analytics/privacy-policy)
- [Explore pricing](https://vercel.com/docs/analytics/limits-and-pricing)
- [Troubleshooting](https://vercel.com/docs/analytics/troubleshooting)

Learn more about how Vercel supports [privacy and data compliance standards](https://vercel.com/docs/analytics/privacy-policy) with Vercel Web Analytics.
