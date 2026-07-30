# Kody Brand Chat handoff

A-Guy-Web owns login. Kody accepts a one-minute, one-use proof of the signed-in
user and creates its own scoped Chat session.

## Browser contract

No Brand Chat button or link is currently mounted in A-Guy-Web. The server-side
handoff is ready for a future product surface.

When a launch control is added, it should use a normal same-origin form:

```html
<form method="post" action="/api/kody/brand-chat/launch">
  <button type="submit">Open Acme Chat</button>
</form>
```

The UI must not create a JWT, accept a user id, include repository or brand
parameters, call Kody directly, or use a GET link. Its only responsibility is
to POST to the fixed A-Guy-Web launch route. The launch route derives the user
from the existing authenticated session and owns the trusted target
configuration.

The launch route validates the existing A-Guy-Web session, signs an ES256 JWT
containing only the opaque user id and target brand, and returns a protected
page that immediately form-posts the JWT to Kody. Kody verifies it, creates a
30-minute HttpOnly session, and redirects to Acme Chat.

No A-Guy-Web password, session cookie, profile, or private key is sent to Kody.
Kody stores only a one-way, issuer-scoped hash of the opaque user id.

## Adding a launch control later

1. Choose the product-owned page where Brand Chat belongs. Do not replace or
   modify the existing `/ask` experience unless that is an explicit product
   decision.
2. Add the form above using the page's existing button component and design
   tokens.
3. Keep the action fixed at `/api/kody/brand-chat/launch`; do not add client-side
   authentication or token handling.
4. Test signed-out behavior, signed-in redirect, expired/replayed assertions,
   and the final Kody Chat route in a real browser.

## Trust configuration

A-Guy-Web server variables:

- `KODY_BRAND_CHAT_PRIVATE_KEY`: ES256 PKCS#8 private key
- `KODY_BRAND_CHAT_KEY_ID`: public key version
- `KODY_BRAND_CHAT_LAUNCH_URL`: Kody external-launch endpoint
- `KODY_BRAND_CHAT_TARGET`: exact `owner/repo/brand`

A-Guy-Web publishes the matching public key at:

```text
/.well-known/kody-brand-chat-jwks.json
```

Kody repository variables for the target repository:

- `CLIENT_IDENTITY_ISSUER`: A-Guy-Web origin
- `CLIENT_IDENTITY_AUDIENCE`: `kody-brand-chat`
- `CLIENT_IDENTITY_JWKS_URL`: the A-Guy-Web JWKS URL

## Security behavior

- The private key stays only in A-Guy-Web.
- Assertions expire after 60 seconds and cannot be replayed.
- Kody requires exact issuer, audience, repository, and brand matches.
- Cross-site requests cannot ask A-Guy-Web to mint an assertion.
- Responses containing an assertion are not cached and send no referrer.
- Missing configuration, session, shared security state, or brand state fails
  closed.
