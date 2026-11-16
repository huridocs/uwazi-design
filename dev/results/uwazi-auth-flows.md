# Uwazi: authentication and account-access flows

Source: huridocs/uwazi, branch `production`, commit ebba4d1e (2026-10-25), read from a scratch clone. Paths are relative to the repo root; the legacy login screens are `app/react/Users/*.jsx` and the backend is under `app/api/core`. Nothing was run. Copy is the English text from `contents/ui-translations/en.csv` where a key exists. Where a string has no translation entry (marked "raw"), the English source text is what the user sees.

Shorthand: `CTRL` = `app/api/core/infrastructure/express/users`, `UC` = `app/api/core/application`, `Login.jsx` = `app/react/Users/Login.jsx`.

## 0. Overview

| # | Flow | URL / endpoint | Email? |
|---|---|---|---|
| 1 | Log in | `/login`, `POST /api/login` | no |
| 2 | Log in with 2FA (second step) | same page, same endpoint | no |
| 3 | Forgot password (request) | same `/login` page, `POST /api/recoverpassword` | yes |
| 4 | Set or reset password via link | `/setpassword/:key`, `POST /api/resetpassword` | link from email |
| 5 | New user invitation (welcome email) | admin creates user; user lands on `/setpassword/:key?createAccount=true` | yes |
| 6 | Account lockout and unlock by link | `/unlockaccount/:username/:code`, `POST /api/unlockaccount` | yes |
| 7 | Admin unlock, admin reset password, admin reset 2FA | Settings, Users & Groups | reset password sends the recovery email |
| 8 | 2FA setup (Account page) | `/settings/account`, `POST /api/auth2fa-secret`, `POST /api/auth2fa-enable` | no |
| 9 | Change own email or password | `/settings/account`, `POST /api/users` | no |
| 10 | Log out | `GET /logout` | no |
| 11 | Session expiry and "redirect back" | none (no return URL) | no |
| 12 | Private (login required) vs public collection | Settings, Collection | no |
| 13 | SSO / OAuth | none | no |
| 14 | First run | seeded `admin` user | no |

There is no standalone sign-up. Accounts exist only if an admin creates them (flow 5). There is no captcha, no CAPTCHA after failures and no IP rate limiter on login.

## 1. Log in

**Route.** `/login` (`app/react/Routes.tsx:225`, component `Users/Login.jsx`). On a private instance the same screen is also rendered at `/` for anonymous visitors (`Routes.tsx:137-138`) and on a plain `/login` redirect (see 12). `/login` is exempt from the private-instance gate (`privateInstanceMiddleware.ts:4`).

**Trigger.**
- Header "Sign in" button: V2 header `V2/Components/UI/Header/Header.tsx:178` (key icon) and mobile menu `Header.tsx:57`.
- Legacy menu "Sign in" (`App/Menu.tsx:229`) and footer "Login" (`App/Footer.jsx:57`).
- Redirect from any protected route (see 11 and 12).
- Link target of the welcome and unlock emails.

**Screen** (`Login.jsx:109-278`). Centered column, the Uwazi logo (`/public/logo.svg`, title and alt "uwazi") as an `h1`, no page title text, one form:
- Label **User** (`:132-136`), text input `name=username`, `id=username`. The login field takes the username only: `LoginInputSchema.username` and `getByUsername` (`UC/Login.ts:28-41`). Email is not accepted on login. It is only used on the recovery form (flow 3).
- Label **Password**, password input (`:146-156`).
- Under the password: link-style span **Forgot Password or Username?** (`:159-167`).
- Full-width primary button **Login** (`:224-233`).
- If the collection has the cookie policy on and the visitor rejected non-essential cookies (`getConsent() === 'rejected'`): a small grey info line "By logging in you accept the essential session cookie required to stay signed in." (`:234-261`). After a successful login the consent is set to `essential` (`:67-69`).

**Validation.** No client-side validation, no required marker. The form always submits. Server: `username` and `password` must be non-empty strings (`UC/Login.ts:28-33`); an empty field returns 422, which shows a red toast (see below).

**Error handling.**
- Wrong username or wrong password: backend `InvalidCredentials`, message "Invalid username or password", HTTP 401 (`handleError.js:185-187`). The client shows no toast for 401 (`utils/api.js:81-83`). The page sets `error: true` (`Login.jsx:78`): both field groups get `has-error` styling and the text **Login failed - ** appears before the "Forgot Password or Username?" link, which turns red (`:157-167`).
- Unknown user and wrong password are indistinguishable: unknown users still run a bcrypt compare against a dummy password (`UC/Login.ts:18, 43-46`), and every login request sleeps a random 500-1000 ms first (`CTRL/LoginController.ts:14`).
- Locked account: the same 401 and the same message, even with the correct password (`UC/Login.ts:49-55`, `AccountLocked`, `errors.ts:97-101`). The user sees the same "Login failed" state.
- Network failure: red toast "Could not reach server. Please try again later." (`utils/api.js:109-118`).

**Lockout.** After 6 failed attempts (`MAX_FAILED_LOGIN_ATTEMPTS = 6`, `domain/user/Credentials.ts:3`) the account is locked and an "Account locked" email is sent (flow 6). Both wrong passwords and wrong 2FA tokens count (`UC/Login.ts:77-79, 95-98, 101-119`). The counter resets only on a successful login or an unlock; there is no time-based window or auto-unlock.

**Captcha.** Not used at login. Captcha exists only for the contact form and public submissions (`app/api/contact/routes.js`, `app/api/auth/publicAPIMiddleware.ts`, `core/infrastructure/express/captcha/*`).

**After success.** `POST /api/login` returns `{ success: true }` (`LoginController.ts:23-24`), then the client fetches `/api/user` into the store (`Auth/actions.js:9-16`) and does a full page load to `/` (`Login.jsx:16-18, 53-62`). It always lands on `/`, which resolves to the collection's home or library. It never returns to the page the user came from (see 11).

**Legacy hash upgrade.** Old SHA-256 passwords are accepted once and re-hashed with bcrypt (`UC/Login.ts:70-74`). Not user-visible.

**Mock.** One fixed demo credential pair is enough; any other pair shows the error state exactly as above. A mock "locked" user reuses the same error.

## 2. Log in with 2FA

**Trigger.** The user has 2FA enabled (`using2fa`). First submit of username and password succeeds on the password check but no `token` was sent.

**Behaviour.** Backend throws `TwoFactorTokenRequired`, HTTP 409 (`UC/Login.ts:57, 84-90`; `handleError.js:158-162`). The client reacts to status 409 only while `tokenRequired` is false (`Login.jsx:72-73`): it flips the same screen to the token step. At the same time `utils/api.js:89-93` shows an amber (warning) toast "Two-step verification token required" (en.csv:1587).

**Token step screen** (`Login.jsx:172-213`). The user and password fields are removed; the stored values are kept in the form and are resubmitted with the token:
- Heading (`h5`): **Two-step verification**
- Label: **Authentication code**; text input `name=token`
- Help text, two lines: "Open the two-factor Authenticator app on your device" / "to view your authentication code and verify your identity."
- Link-style span: **Return to login** (resets the form and goes back to the first step, `:88-91`)
- Button: **Verify** (`:105-107`)

**Wrong code.** Backend `TwoFactorTokenInvalid`, message "Two-factor authentication failed.", HTTP 400 (`errors.ts:79-83`; deliberately not mapped to 401, `handleError.js:178-184`). The client shows a red toast "Two-factor authentication failed." and sets `error2fa`: the group gets `has-error`, a warning triangle icon with **Two-factor verification failed** appears above the help text, the token field is cleared and the "Return to login" link turns red (`Login.jsx:75-79, 174-210`). Each wrong token counts toward the 6-attempt lockout.

**Validation.** Token is any non-empty string on the client; the server verifies a TOTP with `otplib.authenticator.verify` (`UC/Login.ts:92`), default RFC 6238 settings (6 digits, 30 s step).

**Recovery codes.** None exist. If the authenticator is lost, an admin resets 2FA (flow 7). A user cannot turn 2FA off themselves.

**Mock.** One demo account flagged as 2FA: after the password step show the token step, accept any 6 digits except `000000`, show the wrong-code state for that one. Show the amber toast too, or fold it into the screen.

## 3. Forgot password (request)

**Route.** No separate page: it is a mode of `/login`.

**Trigger.** Click **Forgot Password or Username?** (`Login.jsx:83-86, 159-167`).

**Screen** (`Login.jsx:99-102, 125-169, 214-223, 262-272`):
- The label of the first field changes from "User" to **Email**; the password group is hidden (`is-hidden`).
- Help paragraph (small grey): "If an account exists with the email you provided, you will receive an email with instructions to reset your password." (`:214-223`)
- Green full-width button **Send recovery email** (`btn-success`).
- Under it a link-style **Cancel** (`:262-272`), which returns to the login mode.

**Validation.** Server only: `email` must be a valid email (`z.string().email()`, `UC/RecoverPassword.ts:7-10`), otherwise 422 and a red toast. No client check.

**Server.** `POST /api/recoverpassword` (`CTRL/routes.ts:43`) is public (allow-listed for private instances, `PrivateInstanceMiddleware.ts:7-13`). It looks up the user by email. If none exists it does nothing and still answers `"OK"` (no enumeration, `UC/RecoverPassword.ts:22-25`, `CTRL/RecoverPasswordController.ts:17-18`). If found, it creates a 32-byte random hex key valid for 24 hours (`MongoPasswordRecoveriesDataSource.ts:14, 31`; TTL index, migration 203; Postgres checks `expiresAt > now()`, `PostgresPasswordRecoveriesDataSource.ts:37`) and sends the recovery email. There is no throttle; each request makes a new key and older keys stay valid until expiry or use.

**Confirmation.** The form resets and returns to login mode (`Login.jsx:47-51`), and a green (success) toast appears: "If the email address supplied is correct, we will send instructions to reset the password." (`Auth/actions.js:18-24`, key "Instructions to reset password", en.csv:694). The success looks identical whether the email exists or not.

**Email.** From `api/core/domain/email/templates/passwordRecoveryEmail.ts:10-20`:
- Subject: `Password recovery`
- Plain text only, no HTML:
  ```
  Your username is: <username>
  To set your password click on the following link:
  <domain>/setpassword/<key>
  This link will be valid for 24 hours.
  ```
  This is how a user who forgot their username recovers it: the link is only sent to the email, and the username is in the body.
- Sender: `"<site name>" <sender email>` from Settings (`NodemailerEmailSender.ts:36-40`); transport from the instance's `mailerConfig`.

**Mock.** Show the same confirmation toast for any input. Show the email text in a small "email sent" preview or dev panel and link it to the reset screen, since the prototype has no mail.

## 4. Reset or set password via link

**Route.** `/setpassword/:key` (`Routes.tsx:322`), public even on private instances (`PrivateInstanceMiddleware.ts:4`). The same page serves the welcome email (flow 5, with `?createAccount=true`).

**Screen** (`Users/ResetPassword.jsx:48-107`). Same centered column, no title or logo:
- Only when `?createAccount=true`: a blue info alert with an info icon: "To complete the account creation process, please create a password for your account" (`:53-64`).
- **Password** (password input, `id=password`)
- **Repeat Password** (`id=repeat-password`)
- Button **Save password** (primary, full width)

**Validation** (`:32-39`, client only): both fields must match and the first must not be empty after trimming. Otherwise both groups get `has-error` and under the repeat field the red text "Passwords don't match" (key "mismatched passwords") appears. This message also shows for an empty password. There are no strength, length or character rules in this flow, and the backend only requires a string (`UC/ResetPassword.ts:7-10`).

**Server.** `POST /api/resetpassword` with `{ password, key }` (`Auth/actions.js:26-32`). It finds the key, hashes the new password with bcrypt (10 rounds) and in one transaction sets the password, clears the lock fields (`failedLogins`, `accountLocked`, `accountUnlockCode`) and deletes the key (`UC/ResetPassword.ts:21-36`). A reset therefore also unlocks the account. 2FA is not touched.

**After success.** Green toast "Password changed success" (raw text, en.csv:1035), then a client-side navigation to `/login` (`ResetPassword.jsx:41-43`). The user is not logged in automatically.

**Invalid, used or expired link.** The key is not found, so `RecoveryKeyNotFound` is thrown (400, message "Recovery key not found", `errors.ts:67-71`). The client shows a red toast "Recovery key not found" (raw), clears both fields and stays on the page (`ResetPassword.jsx:41-45`); there is no dedicated "link expired" screen and no way to request a new link from that page. The page does not validate the key on load: an expired link looks valid until Save is pressed.

**Mock.** Accept any key except `expired`. For `expired`, show the red toast and stay on the page. Add a "Request a new link" link back to the forgot-password mode as an improvement over production, and mark it as such.

## 5. New user invitation (admin creates a user)

**Where.** Settings > Users & Groups (`/settings/users`, `V2/Routes/Settings/Users/`), admin only. "New user" opens a side panel (`components/UserFormSidepanel.tsx:218`).

**Panel fields** (`UserFormSidepanel.tsx:227-358`):
- Card **General Information**: **Username** (required, 3 to 50 chars, no spaces, unique case-insensitively; errors "Username is required", "Username is too short", "Username is too long", "Usernames cannot have spaces", "Duplicated username"), **User Role** select (Admin, Editor, Collaborator; a "?" button opens the permissions list), **Email** (required, valid format, unique, max 256; errors "A valid email is required", "Duplicated email").
- Card **Security**: **Password** (optional; max 50, error "Password is too long").
- Multiselect **Groups** (placeholder "Nothing selected").
- Footer: **Cancel**, **Save**.
- Save opens a confirmation dialog: header "Confirm", body "Confirm action", field "Enter your current password to confirm" (the admin's own password, sent as a Basic authorization header and checked by `ValidatePasswordMiddleWare.ts:18-32`; wrong password returns 403 `{"error":"Password error"}`), buttons Cancel and Accept.
- Success toast "Added new user".

**Password with or without.** The password is optional. `CreateUserInputSchema.password` is `.optional()` and with none given `EncryptedPassword.create(undefined)` stores a random 32-byte hex password nobody knows (`UC/CreateUser.ts:21, 43-46`; `EncryptedPassword.ts:17-22`). If the admin does type one, it is set and works. `sendWelcomeEmail` defaults to true and the UI never sets it to false, so the welcome email is always sent (`CreateUser.ts:23, 51-53`).

**Welcome email** (`welcomeEmail.ts:11-38`): a new 24-hour key, same store as recovery.
- Subject: `Welcome to <site name>` (falls back to "Uwazi")
- Text:
  ```
  Hello!

  The administrators of <site> have created an account for you under the user name:
  <username>

  To complete this process, please create a strong password by clicking on the following link:
  <domain>/setpassword/<key>?createAccount=true
  This link will be valid for 24 hours.

  For more information about the Uwazi platform, visit https://www.uwazi.io.

  Thank you!
  Uwazi team
  ```
  An HTML version has the same sentences with `<b>` around the username and the link as an anchor.

**Then.** The user opens the link and sees flow 4 with the "To complete the account creation process..." alert, saves a password, and lands on `/login`. If the link expires the admin uses "Reset Password" on the user (flow 7), which sends the Password recovery email instead.

**Mock.** In the admin Users screen, creating a user shows "Added new user" and a mock "welcome email" entry in an inbox panel with a link to the set-password screen with the create-account alert.

## 6. Account lockout and unlock by link

**Trigger.** The 6th failed login or 2FA attempt (see 1). Backend sets `accountLocked`, stores a random 32-byte unlock code and sends the email (`UC/Login.ts:101-119`).

**Email** (`accountLockedEmail.ts:10-20`):
- Subject: `Account locked`
- Text: "Hello,\n\nYour account has been locked because of too many failed login attempts. To unlock your account open the following link:\n<domain>/unlockaccount/<username>/<code>"

**Route.** `/unlockaccount/:username/:code` (`Routes.tsx:323`), public on private instances.

**Screen** (`Users/UnlockAccount.jsx:28-38`): only centered text **Verifying...** while `POST /api/unlockaccount { username, code }` runs (`Auth/actions.js:34-40`). The unlock code has no expiry.

**After.**
- Success: green toast "Account unlocked successfully", client navigation to `/login` (`UnlockAccount.jsx:13-17`). The user is not logged in; the failed-login counter and lock are cleared (`UC/UnlockAccount.ts:17-23`).
- Failure (wrong code or username): backend `findByUsernameAndUnlockCode` fails with a `DomainError`, 400, message "Invalid username or unlock code" (`errors.ts:61-65`, raw). A red toast shows it and the page still navigates to `/login` (`.catch` at `:18-20`).
- A locked account stays locked until the link is used, an admin unlocks it, or the password is reset (flow 4).

**Mock.** Add a "locked" demo user. Show the same generic login error, show the email preview, and make the link screen a short "Verifying..." then redirect with the success toast.

## 7. Admin actions on another user

All in the Users & Groups side panel (`UserFormSidepanel.tsx:304-343`) and the bulk bar (`Users.tsx:20, 80-100`).
- **Reset Password** (ghost button, shown for an existing user): no confirmation dialog; calls `POST /api/recoverpassword` with the user's email, the same path as flow 3. Toast "Instructions to reset the password were sent to the user". The panel stays open. Bulk version: same toast.
- **Reset 2FA**: confirmation dialog (admin password), `POST /api/auth2fa-reset` (admin only; `auth2fa/routes.ts:21-26`) with `{ _id }`, which sets `using2fa` off (`ResetTwoFactorAuth.ts:23-25`). Toast "Disabled 2FA". Panel closes. The user keeps the same password and can log in without a token, and can enable 2FA again from Account.
- **Unlock account** (red secondary button, shown only if the user is locked): confirmation dialog, `POST /api/users/unlock { _id }` (`CTRL/routes.ts:34-39`), toast "Account unlocked successfully".
- The users table marks a locked user with a red username and a lock icon with the tooltip "Account locked" (`TableComponents.tsx:69-82`), and a "Protection" column with the pill "Password + 2fa" or "Password" (`:21-34`).
- Other rules: cannot delete yourself or the last user, cannot remove the last admin or change your own role (`errors.ts:24-41`, `UpdateUser.ts:50-62`). The system user `PublicUser` cannot be modified or deleted.

## 8. 2FA setup (Account page)

**Route.** `/settings/account` (`Routes.tsx:325`, `V2/Routes/Settings/Account/Account.tsx`), available to every role (admin, editor, collaborator).

**Card on Account** (`Account.tsx:137-175`), title **Two-Factor Authentication**:
- Off: yellow card; secondary button **Enable**; text "You should activate this feature for enhanced account security."
- On: default card; disabled green button **Activated**; text "Your account's security is enhanced with two-factor authentication."

**Enable** opens a large side panel titled **TWO-FACTOR AUTHENTICATION** (`TwoFactorSetup.tsx:85-181`). Opening it calls `POST /api/auth2fa-secret`, which generates a secret and an `otpauth://` URI (`GenerateTwoFactorSecret.ts:14-29`; the issuer is the site name cut to 30 chars) and stores the secret unactivated. Calling it again while 2FA is on returns "Two-factor authentication is already enabled". Content:
- Card **Using Authenticator**: ordered list: (1) "Download a third-party authenticator app from your mobile store." with the italic note "(Google Authenticator, LastPass Authenticator, Microsoft Authenticator, Authy, etc.)"; (2) "Add an account to the app by scanning the provided QR code with your mobile device or by inserting the provided key."; italic line "Instructions on how to achieve this will vary according to the app used, please refer to the app's documentation."
- Card **QR Code**: 180 px QR of the `otpauth` URI.
- Card **Secret keys**: copyable field with label "You can also enter this secret key into your Authenticator app." and the italic note "*please keep this key secret and don't share it."
- Field label (bold): "Enter the 6-digit verification code generated by your Authenticator app"; text input, autocomplete off.
- Footer: ghost **Cancel**, primary **Enable** (disabled until something is typed).

**Verification.** `POST /api/auth2fa-enable { token }` (`EnableTwoFactorAuth.ts:17-32`). A wrong token returns 400 and shows under the field, in red: "The token does not validate against the secret key!" and the field gets the error state. No toast for that case. Other errors give a red toast "An error occurred" with detail.

**After success.** The panel closes, the page revalidates, green toast "2FA Enabled", the card becomes "Activated". No recovery codes are shown. The next login uses flow 2.

**Disable.** No self-service disable; admin Reset 2FA only (flow 7).

## 9. Change own email or password

On the same Account page (`Account.tsx:72-136`), form fields (react-hook-form, validated on submit):
- Card **General Information**: **Username** (read-only), **User Role** (read-only), **Email** (required, valid format; error "A valid email is required").
- Card **Change Password**: **New password** and **Confirm new password** (mismatch error "Passwords do not match" under the first field). No length or strength rule.
- Footer: red-outline link **Logout** (`href="/logout"`) and primary button **Update**, disabled until the form is dirty. Update validates, then opens the confirmation dialog: header "Confirm", body "Confirm action", field "Enter your current password to confirm", buttons Cancel and Accept.
- Success: toast "Account updated". Errors: toast "An error occurred" with the server detail (for example a wrong current password gives a 403 "Password error" response; duplicate email gives "The email ... already exists").
- Roles and usernames are editable only by an admin; a non-admin cannot change their own role (`UpdateUser.ts:42-52`).
- Changing the password does not end other sessions (no session revocation in `UpdateUser.ts`).

## 10. Log out

- Links: **Logout** in the Account footer (red outline, `Account.tsx:182-189`) and in the legacy mobile menu (power-off icon, `App/Menu.tsx:214-222`).
- `GET /logout` destroys the session and redirects (302) to `/` (`CTRL/LogoutController.ts:3-8`). No confirmation, no toast. For a private instance `/` then shows the login form; for a public one the anonymous library.

## 11. Session expiry and redirect back

- Cookie and store: express-session with a session cookie (no `maxAge`), store TTL 14 days, refreshed at most once per 24 h (`auth/routes.js:16-21`, `httpSessionStore.ts:8-9`). So the session ends when the browser is closed or after 14 days idle, whichever first. There is no idle-timeout warning or modal.
- Server-rendered protected routes redirect to `/login` with a plain 302 (`entry-server.tsx:480-488`). Client protected routes use `<Navigate to="/login" replace />` (`ProtectedRoute.tsx:23`). API calls from an expired session return 401 `{"error":"Unauthorized"}` (`authMiddleware.ts:18-19`). The V2 client reacts to any 401 with `window.location.assign('/login')` (`V2/api/policies.ts:84-93`); the legacy client has `redirect('/login')` in `utils/api.js:81-83`, whose return value is not used, so it does not navigate on its own.
- There is no return-to-page: no `returnTo`, `next` or `redirect` parameter exists anywhere (searched the repo). After login the user always goes to `/` (see 1). This is a gap worth deciding on for the prototype: Uwazi does not do it, but a mock could, with a note.

## 12. Private (login required) vs public collection

- Setting: Settings > Collection, toggle labelled **Public instance** with the tip "Check to make this instance public (non-logged in users can see public documents and entities)" (`V2/Routes/Settings/Collection/Collection.tsx:313-321`, `collectionSettingsTips.tsx:39-43`). The stored flag is `private`, the toggle is its inverse (`Collection.tsx:152, 182`).
- Public (default): anonymous visitors can browse published documents and entities (per the toggle's tip). "Sign in" is shown in the header; Settings and the Logout items are shown only when logged in. A system user `PublicUser` (collaborator role) is seeded for this; how it is applied to anonymous requests was not traced.
- Private: `privateInstanceMiddleware` (`PrivateInstanceMiddleware.ts:18-42`) lets through logged-in users, `login`, `setpassword/`, `unlockaccount/`, `embed/` pages and the `/api/recoverpassword`, `/api/resetpassword`, `/api/unlockaccount`, `/api/public` calls. Anything else gets `401 {"error":"Unauthorized"}` for `/api/`, `/files/`, `/assets/`, `/uploaded_documents/`, and a redirect to `/login` for pages. The login screen has no extra message explaining the instance is private. The "Sign in" link is not locale-prefixed on private instances (`Menu.tsx:233`).
- Roles in the UI: admin, editor, collaborator (`UserFormSidepanel.tsx:29-41`). `ProtectedRoute` (`ProtectedRoute.tsx:6-24`) sends to `/login` without a role check message: a logged-in editor visiting an admin-only page is also sent to `/login`, not shown a "forbidden" screen.

## 13. SSO / OAuth / other providers

None. The only passport strategy is `passport-local` (`package.json:236`); the repo has no SAML, OIDC, OAuth, LDAP or social login code (searched). There is no "Sign in with ..." UI.

## 14. First run

No setup wizard or "create the first admin" screen. A fresh instance is seeded from `app/api/infrastructure/blank_state/data/users.json` with `admin` (role admin, email `admin@uwazi.local`) and the system `PublicUser`. The README states: "The application's default login is admin / change this password now" (`README.md:182`). Nothing in the app forces a password change at first login.

## Email summary

| Email | Subject | Sent when | Link |
|---|---|---|---|
| Welcome | `Welcome to <site>` | admin creates a user | `/setpassword/<key>?createAccount=true`, 24 h |
| Password recovery | `Password recovery` | forgot password, or admin "Reset Password" | `/setpassword/<key>`, 24 h; also states the username |
| Account locked | `Account locked` | 6th failed attempt | `/unlockaccount/<username>/<code>`, no expiry |

All are sent by the instance's SMTP settings (`NodemailerEmailSender.ts`), plain text (welcome also HTML). 2FA, logout and the password change never email. Mail failures at lock time or welcome time were not traced.

## What a prototype mock should do

- Mock auth with a small set of demo accounts: normal, 2FA (token `123456`), locked, new user with a pending invitation. Reset links and unlock links work for any key, except one named to show the failure toast.
- Show mail as a "Sent emails" preview (dev panel or small drawer) with the exact subject and text above and a clickable link.
- Keep these production behaviours: login accepts the username only; one generic "Login failed" for wrong user, wrong password and locked; forgot-password always confirms; 6 failures lock; reset and unlock return to `/login` and do not sign in; link failures show a toast, not a screen.
- Where production has gaps that Juan may want to improve, label them as prototype additions: return to the page after login, a "link expired" state with a request-new-link action, a visible locked message, password rules with a show/hide control, a "private collection" notice on the login screen.

## Not verified

- Behaviour of the email sending when SMTP is missing or fails (account lock, welcome).
- Real rendering of the screens (read from source only), including the exact colours, the Bootstrap legacy styling of the login page and the responsive layout.
- The session TTL on the Mongo backend: only `touchAfter` is passed (`httpSessionStore.ts:21-23`). The 14-day TTL is explicit only in the Postgres store (`httpSessionStore.ts:8, 54`).
- The OTP window and clock skew tolerance (library defaults assumed).
