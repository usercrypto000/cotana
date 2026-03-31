# Decisions

This document will hold short ADR-style notes when the implementation makes a meaningful architectural tradeoff.

## Current decisions

- Privy remains the only visible auth layer, with Cotana issuing its own HttpOnly session cookie for server authorization
- Admin authorization is enforced through allowlisted email and local `ADMIN` role checks
- Public data reads happen through Prisma-backed server components, while mutations use route handlers for consistency
- Review eligibility is centralized in one shared DB service rather than duplicated across routes and pages
