# Vercel Admin and Shared Storage

The participant list is public. Admin sign-in and state writes are handled by Vercel Functions; shared JSON state is stored in a private Vercel Blob store. No Supabase project is used.

## Configure the Vercel project

1. In the Vercel project, open **Storage**, create a **private Blob** store, and connect it to this project for Production and Preview. Vercel supplies the Blob OIDC environment variables to the connected Functions.
2. In **Settings → Environment Variables**, add `ADMIN_PASSWORD` with the password you want to use at the Admin screen.
3. Add `ADMIN_SESSION_SECRET` with a separate random secret. You can generate one locally with `openssl rand -hex 32`; enter the result directly in Vercel and do not commit it.
4. Redeploy after adding the store and variables.

The Admin cookie is HttpOnly, SameSite Strict, and expires after eight hours. The initial Admin password and session secret are kept in Vercel environment variables, not in the browser bundle. After signing in, use **Perfis → Segurança da conta Admin** to change the password; the new password is stored as a salted hash in the private Blob store and takes precedence over `ADMIN_PASSWORD`. New passwords must be 12–128 characters. Keep usage within your plan's current Blob and Function quotas; exceeding included usage may incur charges.
