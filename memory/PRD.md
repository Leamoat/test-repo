# boxRadar — PRD

## Overview
boxRadar is a collaborative parcel delivery mobile app (React Native Expo) connecting senders with travelers between Europe and Africa. NO online payments — financial transactions happen face-to-face. Trust is secured by a 6-digit Validation Code system.

## Tech Stack
- Frontend: Expo Router, React Native, TypeScript, react-native-reanimated, expo-linear-gradient, AsyncStorage, axios
- Backend: FastAPI, MongoDB (motor), JWT (Bearer tokens), bcrypt
- Theme: Modern Afro-Tech — Cobalt Blue #0F3057 + Amber #FF6B00, off-white background, rounded-xl 12px, radar pulse animation

## Auth
Email/Password JWT (mobile-friendly Bearer tokens via AsyncStorage). Three user types: sender, traveler, pro.

## Core Flows
1. **Onboarding**: Welcome → choose role → register/login
2. **Discover**: Bottom-tab Home with Trip/Parcel toggle, search by from/to city, listing cards with pulsing radar animation while loading
3. **Post listing**: Parcel or Trip with origin/destination/date/weight/price
4. **Make offer**: Tap listing → Make Offer modal → creates conversation
5. **Chat**: Polling every 4s, message bubbles, offer cards, accept/reject by listing owner
6. **Validation**: On accept → 6-digit code generated. Sender sees the code, traveler enters it on delivery
7. **Review**: After delivery completed, both parties can post 1–5 star review

## Endpoints
- Auth: `/api/auth/register|login|me|profile`
- Listings: `/api/listings` (GET filters, POST), `/api/listings/{id}`
- Offers/Conversations: `/api/offers`, `/api/conversations`, `/api/conversations/{id}`, `/api/conversations/{id}/messages|accept-offer|reject-offer`
- Deliveries: `/api/deliveries/{id}`, `/api/deliveries/{id}/validate`
- Reviews: `/api/reviews`
- Users: `/api/users/{id}`

## Seed Data
Auto-seeded admin + 3 demo users (Aminata sender, Lucas traveler, Kwame pro) and 5 demo listings (Paris-Dakar, London-Accra, Marseille-Abidjan, Brussels-Kinshasa, Madrid-Lagos).

## Business Enhancement
**Pro Carrier tier** baked in (`user_type=pro`) — sets foundation for future premium subscription with verified badge, priority listing placement, and recurring trip schedules — converting frequent travelers into a revenue stream.
