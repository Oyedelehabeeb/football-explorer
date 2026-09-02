# Football Explorer — Agent Instructions

## 1. Project Identity

Football Explorer is a production-quality football intelligence and exploration web application.

The product allows users to discover and explore rich football data including:

* countries
* competitions
* seasons
* standings
* teams
* players
* fixtures
* results
* match events
* lineups
* formations
* match statistics
* head-to-head records
* top performers
* player statistics
* transfers
* trophies
* injuries
* sidelined players
* predictions

The product should feel like a **premium football data and intelligence platform** rather than a generic sports dashboard, football-news website, betting application, or simple API demonstration.

Users should immediately see useful football content when they enter the application.

Authentication, onboarding, choosing a favorite team, or performing an action must never be required before users can discover meaningful content.

The product should encourage exploration. Users should be able to naturally move between:

Country → Competition → Team → Player → Match → Statistics → related entities

and discover information from multiple directions.

---

# 2. Technology Stack

The project uses:

* TanStack Start
* React
* TypeScript
* TanStack Router
* TanStack Query where appropriate
* Tailwind CSS
* shadcn/ui

Do not introduce Next.js.

Do not migrate the application to another framework.

Do not replace established technologies without discussing the reason and receiving approval.

Use strict TypeScript and maintain strong type safety throughout the application.

Prefer the existing project tooling and dependencies unless there is a clear reason to change them.

---

# 3. Product Constraints

## No Odds

Odds are excluded from the product.

Do not implement:

* pre-match odds
* in-play odds
* bookmakers
* betting recommendations
* betting interfaces
* gambling-oriented features

This is a permanent product constraint unless explicitly changed by the product owner.

## Realtime

Realtime functionality is not a core product requirement.

Do not introduce WebSockets, subscriptions, or other realtime infrastructure unless a specific product requirement justifies it and the approach has been discussed and approved.

Do not assume that a provider's realtime mechanism is exempt from API usage limits.

## No Premature Architecture Decisions

Do not make premature assumptions about whether the application should use:

* PostgreSQL
* another database
* Redis
* server-side caching
* CDN storage
* external image hosting
* background jobs
* scheduled synchronization
* direct API consumption
* persistent data
* other infrastructure

The appropriate architecture must be determined after understanding:

1. The API provider's official documentation.
2. The provider's recommendations.
3. Actual API response structures.
4. API request limits.
5. Data freshness requirements.
6. Product requirements.
7. Performance requirements.
8. Cost.
9. Operational complexity.
10. Scalability requirements.
11. SEO requirements.
12. Media/image requirements.

If the API provider recommends a particular database, cache, CDN, image-hosting strategy, synchronization strategy, or other infrastructure, take that recommendation seriously and evaluate it.

Do not reject infrastructure simply because it was not part of the initial plan.

Likewise, do not introduce infrastructure simply because it is common in other applications.

Choose the simplest architecture that is appropriate for the actual requirements.

If multiple architectures are reasonable, explain the trade-offs and ask the product owner to approve the direction before making a major architectural commitment.

---

# 4. Primary Data Provider

The primary football data provider is API-Football.

The current development plan provides access to capabilities including:

* Countries
* Seasons
* Leagues
* Standings
* Teams
* Livescore
* Fixtures
* Head to Head
* Events
* Line Ups
* Top Scorers
* Players & Coaches
* Player Transfers
* Trophies
* Sidelined
* Injuries
* In-play Odds
* Pre-match Odds
* Statistics
* Predictions

Only the relevant non-odds capabilities should be used for Football Explorer.

---

# 5. API Documentation Is a Source of Truth

The API provider has extensive official documentation containing:

* endpoint descriptions
* request formats
* parameters
* parameter definitions
* example requests
* example responses
* response field definitions
* pagination information
* limitations
* provider recommendations
* usage guidance
* data behavior
* related endpoint information

The official API documentation should be treated as a primary source of truth.

Never invent API behavior.

Never assume an API response structure.

Never create TypeScript types based purely on guesswork.

Never design a data-driven feature around fields that have not been verified.

---

# 6. Documentation Walkthrough Process

The product owner will provide relevant API documentation and response examples during development.

After the initial project/design discovery stage, request the API documentation from the product owner in logical groups.

For each endpoint, request or verify, where available:

* endpoint description
* request method
* request URL
* parameters
* parameter descriptions
* example request
* example response
* response field explanations
* pagination behavior
* limitations
* rate-limit information
* caching recommendations
* image/media recommendations
* relationships with other endpoints
* provider implementation recommendations

As documentation is provided, build a coherent understanding of:

* entities
* identifiers
* relationships
* nested structures
* data freshness
* data dependencies
* reusable responses
* pagination
* request requirements
* potential duplicate requests
* architectural implications

If the documentation does not answer an important question, explicitly identify the uncertainty and ask for clarification.

---

# 7. API Request Discipline

API requests should be intentional and efficient.

Whenever implementing an API-powered feature, consider:

* How many API requests does this feature require?
* Can data be reused between components?
* Can requests be deduplicated?
* Can responses be cached?
* Can multiple UI sections use the same response?
* Does the provider recommend persistence?
* Does the provider recommend a particular caching strategy?
* What happens when the API fails?
* What happens when no data is returned?
* What happens when the API rate limit is reached?

Do not optimize prematurely.

However, avoid obvious duplicate fetching and unnecessary requests.

---

# 8. Design Philosophy

Football Explorer should feel like:

**Premium sports editorial + sophisticated data visualization + modern product design.**

The design should have its own identity.

Avoid making the application look like:

* a generic SaaS dashboard
* an admin panel
* a betting website
* a generic sports template
* a direct clone of ESPN
* a direct clone of SofaScore
* a direct clone of FotMob
* an unmodified shadcn/ui template
* a collection of generic cards

The product should feel visually rich without becoming visually noisy.

Prioritize:

* strong visual hierarchy
* excellent typography
* purposeful whitespace
* high-quality imagery
* elegant data presentation
* meaningful visualizations
* restrained use of color
* responsive layouts
* accessibility
* subtle purposeful motion

---

# 9. Color Direction

The primary brand direction is:

**White + Orange in light mode**

**Black + Orange in dark mode**

Light mode should primarily use:

* white / very light neutral backgrounds
* dark charcoal text
* orange accent
* subtle neutral borders
* restrained neutral secondary surfaces

Dark mode should primarily use:

* near-black / very dark backgrounds
* off-white text
* orange accent
* dark charcoal secondary surfaces
* subtle dark-neutral borders

The same orange identity should work across both themes.

Orange should be used intentionally for:

* primary actions
* active navigation
* selected states
* important highlights
* key statistics
* visual emphasis
* meaningful status indicators

Do not make the entire interface orange.

The design principle is:

**White/black is the canvas. Orange is the energy.**

The exact orange value should be determined during the design phase rather than arbitrarily chosen.

Do not introduce a large secondary brand palette without a clear reason.

Neutral colors may be used extensively for hierarchy, readability, and accessibility.

---

# 10. Typography

Typography must support both editorial presentation and dense football data.

Prioritize:

* highly readable body text
* strong display hierarchy
* distinctive but professional headings
* excellent player/team/competition name presentation
* excellent numerical readability
* compact but readable metadata
* responsive typography

Use a modern professional sans-serif/grotesk direction unless the approved visual system determines otherwise.

The exact font family will be decided during the design phase after considering the visual references and product requirements.

Do not introduce multiple unrelated fonts.

Typography should be implemented consistently through the application's design system.

---

# 11. Reference Screenshots

Reference screenshots may be provided during development.

They are visual references, not templates.

Analyze them for:

* composition
* layout
* information hierarchy
* typography
* spacing
* navigation
* imagery
* card composition
* tables
* charts
* badges
* data density
* interaction patterns
* responsive behavior
* animation/motion principles

Extract useful design principles and create an original Football Explorer visual identity.

Do not copy:

* branding
* logos
* proprietary assets
* exact layouts
* distinctive visual identities
* exact component arrangements

---

# 12. Data Presentation

Football Explorer is data-rich.

Use the most appropriate visual form for each type of information:

* cards for summaries
* tables for structured datasets
* charts for trends and comparisons
* stat blocks for important numbers
* badges for states
* timelines for chronological information
* visual formations for lineups
* lists for dense related information

Do not turn every piece of information into a card.

Use hierarchy to determine the appropriate presentation.

---

# 13. Component Philosophy

Use shadcn/ui as a foundation where appropriate.

However, do not allow the application to look like an unmodified shadcn/ui template.

Components should be:

* accessible
* reusable when reuse is meaningful
* composable
* responsive
* visually consistent

Create abstractions when they provide real value.

Do not create abstraction layers merely for the sake of abstraction.

---

# 14. Loading, Empty and Error States

Every API-powered experience must account for:

* loading
* successful data
* empty results
* partial data
* API errors
* unavailable information
* rate-limit errors where applicable

Never leave users staring at a blank screen when a useful state can be communicated.

Skeletons should reflect the actual structure of the content they represent.

---

# 15. Responsive Design

Desktop and mobile are both first-class experiences.

Do not simply shrink the desktop interface for mobile.

Consider independently:

* navigation
* tables
* filters
* cards
* typography
* touch targets
* charts
* comparison interfaces
* information hierarchy
* image sizing

at each breakpoint.

---

# 16. Accessibility

Prioritize:

* semantic HTML
* keyboard navigation
* visible focus states
* sufficient color contrast
* accessible labels
* meaningful alt text
* correct heading hierarchy
* accessible interactive controls

Do not sacrifice accessibility for visual effects.

---

# 17. SEO

Public football entity pages should be designed with discoverability in mind.

Where appropriate, support:

* meaningful URLs
* page metadata
* canonical URLs
* Open Graph metadata
* sitemap generation
* appropriate structured data
* crawlable content

Do not make important football information dependent entirely on client-side interactions if doing so harms discoverability.

---

# 18. Development Workflow

Football Explorer is developed incrementally.

Do not autonomously build the entire application.

For every significant feature:

1. Understand the requirement.
2. Inspect the existing implementation.
3. Inspect relevant documentation.
4. Inspect actual API responses where appropriate.
5. Identify ambiguity.
6. Ask questions when necessary.
7. Propose an implementation approach.
8. Obtain approval when the decision materially affects architecture or product behavior.
9. Implement the feature.
10. Test the feature.
11. Review the implementation.
12. Check API request efficiency.
13. Check TypeScript quality.
14. Check responsive behavior.
15. Check accessibility.
16. Check visual consistency.
17. Fix discovered issues.
18. Only then move to the next feature.

---

# 19. Questions Before Assumptions

If a requirement is ambiguous and different interpretations could materially affect the product, stop and ask.

Do not:

* invent business rules
* invent API behavior
* invent data structures
* invent unsupported statistics
* invent UI behavior
* add unrelated features
* introduce infrastructure without justification

When multiple reasonable approaches exist, explain the options briefly and ask for a decision.

---

# 20. Scope Discipline

Build the requested feature completely before expanding its scope.

Do not add unnecessary "nice-to-have" features simply because they are technically possible.

Do not implement odds.

Do not implement betting functionality.

Do not introduce unnecessary authentication.

Do not introduce realtime functionality without approval.

Do not introduce unnecessary persistence.

Do not add unrelated third-party services without discussion.

---

# 21. Product Quality Standard

The final application should feel like a product that could genuinely be launched publicly.

Prioritize:

**Product quality over feature count.**

A smaller number of polished experiences is better than dozens of shallow pages.

Every completed feature should feel:

* intentional
* cohesive
* responsive
* accessible
* performant
* visually polished
* production-ready
