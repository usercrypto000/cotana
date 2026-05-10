# Cotana Brand Kit

Cotana uses one product system across the public store, admin app, shared UI package, and future registry surfaces. The logo may stay multicolor, but the product interface is blue-led, restrained, and consumer-native.

## Core Palette

- `brand.primary`: `#2563EB`, primary blue for main actions, links, navigation emphasis, selected states, and the leading product identity
- `brand.accent`: `#84CC16`, accent green for verified marks, readiness, complete metadata, healthy states, and trust-positive signals
- `brand.agent`: `#8B5CF6`, agent violet for machine-readable registry surfaces, agent capability metadata, compatibility states, and hybrid indicators
- `brand.surface`: `#FAFAF7`, neutral product background
- `brand.text`: `#0B0F14`, primary text

## Semantic Usage

- `trust.ready`: use for verified, ready, complete, healthy, and read-only-safe states
- `trust.agent`: use sparingly for agent registry and machine-readable capability surfaces
- `trust.warning`: use for missing metadata, incomplete setup, weak docs, low reliability, or inspect states
- `trust.danger`: use only for errors, unsafe interaction modes, destructive states, and blocked eligibility

## Typography

- Ubuntu is the product emphasis font for headings, hero copy, section titles, navigation emphasis, buttons, badges, and important labels.
- Open Sans is the body and dense-interface font for descriptions, filters, metadata, forms, admin tables, empty states, registry detail text, and longer reading surfaces.
- Inter is fallback only through `Inter, system-ui, sans-serif`.
- Serif fonts are not part of Cotana product UI.

## Public Store Rules

- App cards remain minimal: logo, name, verified mark, one-line truncated description, rating, and category.
- Public cards do not show wallet UI, wallet addresses, seed phrase UX, chain tags, token prices, agent capability metadata, or technical status labels.
- Blue should lead links, calls to action, selected filters, and navigation emphasis.
- Green should appear only where the user is seeing trust, readiness, verification, or healthy state.
- Violet stays off public cards and appears only on detail-page registry sections or machine-readable trust surfaces.

## Agent Registry Rules

- Violet marks the agent layer, not the whole product.
- Agent surfaces should stay quieter than the consumer store experience.
- Green marks complete, ready, read-only, schema-available, safety-notes-available, and docs-available states.
- Warnings and danger states should be operationally clear, not decorative.

## Admin Rules

- Admin uses the same tokens with denser layouts.
- Registry quality, evaluation logs, readiness buckets, and capability scores should use semantic trust colors.
- Admin can expose more technical state than the public store, but it should not introduce wallet actions, credential handling, execution controls, developer self-submission, paid placement, follow graph, feeds, or notifications.

## Do Not Do

- Do not turn the UI into a rainbow system because the logo is multicolor.
- Do not use violet for normal buttons, public cards, or broad page backgrounds.
- Do not use green as a generic accent where no trust or readiness meaning exists.
- Do not make Inter the default product font.
- Do not introduce serif fonts.
- Do not expose agent metadata on public cards.
- Do not use raw brand hex values repeatedly in app components when a token or shared UI variant exists.
