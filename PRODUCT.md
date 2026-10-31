# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: chit organizers (foremen) and their staff, working mostly on a phone: collecting instalments, running auctions, paying out winners, and managing groups and members, often away from a desk. Secondary: members, who use a member portal to see their groups, dues, receipts, results and notifications. Operators of the platform itself (super admin) manage tenants and subscriptions.

Users are in India; names and interface text may be Malayalam or English.

## Product Purpose

KuriPro is an all-in-one chit fund (kuri) management SaaS with a member portal. Each organization (tenant) runs its own chit groups: enrolling members into tickets (full or 50/50 half shares), scheduling cycles, collecting instalments with receipts, running auctions or lotteries to pick each cycle's winner, settling commission and dividends, and paying out prizes. Success means an organizer can run every group's books from a phone and the numbers always reconcile.

## Positioning

A single multi-tenant system that covers the whole chit lifecycle (groups, collections, auctions, payouts, reports, notifications, roles, branches, subscriptions) with a member portal, where every amount reconciles to the paisa and every change leaves a record.

## Operating Context

- Organizers and collection staff work on mid-range Android phones, in the field, often on weak connections.
- Money moves in cash, UPI, bank transfer, cheque and card; receipts are shared over WhatsApp.
- Chit mechanics that are facts of the domain: a group's chit value and member count are fixed once started; each cycle has one winner who gives up a discount; foreman commission (percentage of the pot or a fixed amount per cycle) comes out of that discount and the remainder is paid back as dividend; dues fall on collection dates that may be fixed days of the month.
- Members can be replaced mid-chit; the outgoing member's history is kept and settled separately.

## Capabilities and Constraints

- Roles with permissions: super admin, organizer, staff, member (editable per organization).
- Money is stored as integer paise and always displayed in INR with Indian number formatting (₹, lakh grouping). Amounts are never shown as floating-point values.
- Installable PWA, mobile-first, usable on mid-range Android phones, with some offline use for collections.
- Interface must handle Malayalam and English text, including Malayalam member names.
- **Required, not built yet:** a language selection option so a user can switch the interface between English and Malayalam. There is no i18n library or switch today (the app ships as English only).
- WCAG AA is a hard requirement: AA contrast, full keyboard use, and adequate touch targets.
- Web Push notifications, passkey (biometric) sign-in and OTP are supported.

## Evidence on Hand

- Working application: `frontend/` (React + Vite) and `backend/` (Express + MongoDB); backend conventions in `backend/ARCHITECTURE.md`.
- PWA icons in `frontend/public/`.
- No testimonials, customer logos, pricing or benchmarks exist in the repository; none should be invented.

## Product Principles

1. The books always balance: amounts are exact, and any change (replacement, re-pick, settlement) is recorded and reversible only where it is safe.
2. Phone first for the people doing the work: the common task is done in a few taps, with the next correct action made obvious and risky actions (re-pick, replace) kept out of the way and confirmed.
3. History is never overwritten: records are closed, not deleted.
4. Members see only what is theirs; organizers see their organization only.
5. Plain, confident language in both English and Malayalam; no jargon the organizer would not use themselves.

## Accessibility & Inclusion

WCAG AA required: AA color contrast, keyboard operability, visible focus, and touch targets sized for use on a phone. Interface text must work in English and Malayalam (including font coverage for Malayalam script).
