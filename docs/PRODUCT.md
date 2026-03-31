# Product

## Non-negotiable UX rules

- No connect wallet button
- No visible wallet addresses
- No seed phrase UX
- No blockchain-native copy in the consumer product
- No chain tags on public app cards
- No public developer self-submission in v1
- Public app cards only show logo, name, verified mark, short description, rating, and category

## Identity

- Store auth uses Privy with email, Google, Apple, and passkeys
- Admin auth uses the same provider, but access is restricted to allowlisted or `ADMIN` users
- Wallet creation may exist behind the scenes, but wallet UX is not shown in the product

## Current Phase 1 scope

- Admin-only app creation and editing
- Public browsing by category
- App detail pages with screenshots, likes, saves, and reviews
- Review eligibility thresholds enforced at publish time
- Community flagging with admin moderation queue
- Semantic retrieval with vector search and category-aware reranking
- Background refresh of embeddings, category signals, weekly snapshots, and trending data
- Search, click, view, like, save, review, and auth analytics events

## Review rules

A user can review an app only when all of the following are true:

- account age is greater than 24 hours
- display name exists
- avatar exists
- at least 3 app detail views are recorded
- at least 48 hours have passed since the last published review
- the user has not already reviewed that app
- the review body is at least 80 characters long

Reviews publish immediately when eligible. Reviews are not pre-moderated.
