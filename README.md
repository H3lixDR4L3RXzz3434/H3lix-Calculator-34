# H3lix-Calculator-34
New Calculator

## PWA push notifications

Push reminders are opt-in in Settings. The server sends up to three varied play reminders after a subscribed device has been inactive for 24 hours; opening the app resets the reminder count. Push requires HTTPS (localhost is supported for development), a persistent server process, and VAPID keys.

From the `Index` folder, install dependencies and generate a VAPID key pair with `npx web-push generate-vapid-keys`. Configure these environment variables on the server:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (for example, `mailto:admin@example.com`)

For PowerShell local development, run these commands from `Index` and set the generated values in the same terminal before starting the server:

```powershell
cd Index
npm install
$env:VAPID_PUBLIC_KEY = "your-public-key"
$env:VAPID_PRIVATE_KEY = "your-private-key"
$env:VAPID_SUBJECT = "mailto:admin@example.com"
npm start
```

When `DATABASE_URL` is configured, push subscriptions persist in PostgreSQL. Without it, they are kept in memory and are lost when the server restarts.
