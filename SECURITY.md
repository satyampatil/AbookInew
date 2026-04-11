# Security Notes

## Immediate secret rotation

The old Gemini key was exposed in browser JavaScript. Remove or rotate it in Google Cloud now, then create a new key for the server function only.

Do not put Gemini, service account, payment, email, or admin keys in `public/` files. Anything in `public/` is downloadable by visitors.

## Firebase setup

Store the Gemini key as a Firebase Functions secret:

```sh
firebase functions:secrets:set GEMINI_API_KEY
```

The browser only sends the user's genre/title/idea to `/api/generateBook`. The Cloud Function builds the Gemini prompt on the server, reads `GEMINI_API_KEY` from Firebase Secrets, rejects anonymous Firebase accounts, checks allowed Hosting origins, and rate-limits generation attempts per user.

Deploy the rules, function, and hosting rewrite:

```sh
firebase deploy --only functions,hosting,firestore:rules
```

The Firebase web config in client files is not a server secret, but restrict the API key in Google Cloud Console to your production domains and only the Firebase APIs this app needs.

## Tamper resistance

Browser code cannot be made tamper proof. Users can modify JavaScript, local storage, and network requests. Treat the client as untrusted and enforce real permissions in:

- Firestore security rules
- Firebase Authentication
- Cloud Functions for privileged actions
- Google Cloud API key restrictions
- Firebase App Check, once enabled for Hosting/Functions/Firestore
