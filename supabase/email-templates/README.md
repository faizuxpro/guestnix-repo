# Guestnix Supabase Auth emails

Supabase Auth email templates are stored inside each hosted Supabase project.
Because Guestnix has separate dev and prod Supabase projects, you must repeat
these steps once in the dev project and once in the prod project.

The template source lives in:

`supabase/email-templates/guestnix-auth-emails.mjs`

Use that file as the single source of truth, then generate clean dashboard
copy/paste files from it.

## 1. Choose the project and app URL

Open the correct Supabase project first:

- Prod project: use `https://guestnix.com`
- Dev project used by local app: use `http://localhost:3000`
- Dev project used by deployed/staging app: use that deployed/staging URL

If the dev Supabase project is connected to a deployed app, do not use
`localhost` as the Site URL. Use the deployed/staging domain instead.

## 2. Generate clean dashboard copy files

From the repo root, generate a folder of files for the project you are editing.
Each template gets:

- one `.subject.txt` file for the Supabase Subject field
- one `.html` file for the Supabase Message Body field

For prod:

```powershell
node supabase/email-templates/guestnix-auth-emails.mjs --app-url=https://guestnix.com --out-dir=supabase/email-templates/dashboard-prod
```

For local dev:

```powershell
node supabase/email-templates/guestnix-auth-emails.mjs --app-url=http://localhost:3000 --out-dir=supabase/email-templates/dashboard-dev
```

For deployed/staging dev, replace the URL with your staging domain.

Open the generated folder. The `README.txt` inside it lists which files go with
which Supabase dashboard template.

## 3. Configure Auth URL settings

In Supabase Dashboard:

1. Open the target project.
2. Go to Authentication -> URL Configuration.
3. Set Site URL.
4. Add Redirect URLs.
5. Save changes.

For prod, use:

- Site URL: `https://guestnix.com`
- Redirect URLs:
  - `https://guestnix.com/api/auth/callback**`
  - `https://guestnix.com/**`

For local dev, use:

- Site URL: `http://localhost:3000`
- Redirect URLs:
  - `http://localhost:3000/api/auth/callback**`
  - `http://localhost:3000/**`

For deployed/staging dev, use your staging domain:

- Site URL: `https://your-staging-domain`
- Redirect URLs:
  - `https://your-staging-domain/api/auth/callback**`
  - `https://your-staging-domain/**`

Optional: you can also keep localhost redirect URLs in the dev project if you
test the same dev Supabase project locally.

## 4. Configure sender branding

Email template formatting controls the content, but sender branding is separate.

In Supabase Dashboard:

1. Go to Authentication -> Emails or Authentication -> Settings.
2. Find SMTP settings.
3. Enable custom SMTP if you want emails to come from your own domain.
4. Set the sender name to `Guestnix`.
5. Set the sender email to your verified address, for example:
   `hello@guestnix.com`.
6. Use your email provider's SMTP values.
7. Save changes.

If you do not configure custom SMTP, the emails can still use the branded HTML
templates, but the sender may still be Supabase's default auth sender.

Before using a branded sender domain in production, verify SPF, DKIM, and DMARC
records in your email provider.

## 5. Paste the Auth email templates

In Supabase Dashboard:

1. Go to Authentication -> Email Templates.
2. Open each template listed below.
3. Paste the matching `.subject.txt` file into the Subject field.
4. Paste the matching `.html` file into the Message Body field.
5. Save each template before moving to the next one.

Use this mapping:

| Supabase template | Subject file | HTML file |
| --- | --- | --- |
| Confirm signup | `confirm-signup.subject.txt` | `confirm-signup.html` |
| Magic Link | `magic-link.subject.txt` | `magic-link.html` |
| Reset password / Recovery | `reset-password.subject.txt` | `reset-password.html` |
| Invite user | `invite-user.subject.txt` | `invite-user.html` |
| Change email address | `change-email.subject.txt` | `change-email.html` |
| Reauthentication | `reauthentication.subject.txt` | `reauthentication.html` |

Important variables:

- Confirm signup, Magic Link, and Recovery templates must keep
  `{{ .RedirectTo }}` and `{{ .TokenHash }}` in the button link. The app sends
  `{{ .RedirectTo }}` from the browser origin where signup/sign-in/reset was
  requested, so these email links return to that same host.
- Invite and Email Change templates must keep `{{ .ConfirmationURL }}` unless
  the app starts sending an explicit redirect URL for those flows too.
- Reauthentication must keep `{{ .Token }}`.
- Email Change can use `{{ .NewEmail }}`.

Do not replace `{{ .RedirectTo }}` or `{{ .ConfirmationURL }}` with
`{{ .SiteURL }}`. `{{ .SiteURL }}` is the Supabase project default and can send
users to `localhost` when the project is reused by a deployed app.

## 6. Paste security notification templates

Some Supabase projects show security notification templates separately from the
main Auth templates. If your dashboard exposes them, configure these too.

Use this mapping:

| Supabase security email | Subject file | HTML file |
| --- | --- | --- |
| Password changed | `password-changed.subject.txt` | `password-changed.html` |
| Email address changed | `email-changed.subject.txt` | `email-changed.html` |
| Phone number changed | `phone-changed.subject.txt` | `phone-changed.html` |
| Verification method added | `verification-method-added.subject.txt` | `verification-method-added.html` |
| Verification method removed | `verification-method-removed.subject.txt` | `verification-method-removed.html` |
| Sign-in method linked | `signin-method-linked.subject.txt` | `signin-method-linked.html` |
| Sign-in method removed | `signin-method-removed.subject.txt` | `signin-method-removed.html` |

If the dashboard has an enable/disable toggle for a security notification, turn
it on for each notification you configure.

If a security template is not visible in your dashboard, skip it. Supabase
sometimes exposes these settings differently across project versions.

## 7. Test the project

After saving templates and URL settings:

1. Sign up with a test email address from the app connected to that Supabase
   project.
2. Open the confirmation email.
3. The email should show Guestnix branding.
4. The button URL should start with the app URL where signup happened and point
   to `/api/auth/callback` with `token_hash` and `type` query params.
5. Click the button and confirm you land back in the correct app.
6. Test Magic Link from `/login`.
7. Test Reset Password if that flow is enabled.

For prod, the final landing domain should be:

`https://guestnix.com`

For dev, the final landing domain should match the URL you configured in step 1.

## 8. Repeat for the other Supabase project

Repeat steps 1 through 7 for the second Supabase project.

Recommended order:

1. Configure dev first.
2. Send a test signup email and confirm it works.
3. Configure prod.
4. Send a prod test signup email and confirm it lands on `https://guestnix.com`.
