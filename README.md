# Vibe — React Native starter

Vibe is an early-stage social app prototype built with React Native and Expo.

## Current features
- Home feed with sample posts
- Create a local post
- Like and unlike posts
- Basic Home, Explore, Notifications and Profile tabs

## Important
This is a front-end prototype. Posts are kept in app memory and disappear when the app restarts. There is no real account system, cloud database, messaging, moderation backend or multi-user sharing yet.

## Run the app
This folder is intended to live inside an Expo project created with `create-expo-app`.

From the project folder, run:

```bash
npx expo start
```

If you are using GitHub Codespaces and need a tunnel, sign in to an Expo account first, then run:

```bash
npx expo start --tunnel
```

## GitHub
Commit the project files to your Vibe repository. Do not upload passwords, access tokens, private keys, or backend service-role keys.

## Next development stages
1. Add navigation and profile editing.
2. Add secure sign-up and sign-in.
3. Connect a database and image storage.
4. Add comments, follows and notifications.
5. Add reporting, blocking, privacy controls and moderation before public launch.
