# Business review and competitor scan design

## Context

Pin2pin Fireline already has a defined product positioning and a formal source of truth for target user journeys in `docs/journeys/fireline-hybrid-user-journey-ledger.md`. The current need is not another feature brainstorm, but a business review that answers whether the current product can truly carry those journeys in practice, and how that maturity compares to a real competitor: Vantage 8D.

This work combines an internal product capability review with an external competitive scan. The chosen frame is journey-first: Fireline should be judged primarily against the user journeys it has already committed to, and the competitor analysis should be used to sharpen the understanding of gaps, strengths, and maturity differences.

## Goal

Produce a structured business review that answers three questions:

1. Does the current Fireline product actually satisfy the most important target user journeys?
2. How does Vantage 8D handle the same underlying jobs, workflows, and outputs?
3. Which gaps matter most: missing capabilities, incomplete workflow closure, weak trust/output quality, or simply lower execution maturity?

## Scope

### In scope

1. Read the current journey source of truth and extract the most business-critical user journeys.
2. Review the current Fireline product behavior against those journeys using code, current docs, and hands-on product walkthroughs.
3. Perform a deep competitor scan of `https://www.vantage8d.com` using the provided credentials.
4. Produce a joined assessment that maps:
   - journey satisfaction,
   - competitor handling,
   - meaningful product gaps,
   - priority implications.

### Out of scope

1. Implementing product fixes.
2. Rewriting the journey ledger itself.
3. Turning the review into a broad strategy deck covering unrelated competitors or adjacent product lines.
4. Making design or roadmap decisions before the review evidence is assembled.

## Recommended approach

### 1. Start from our own journey commitments

Use `docs/journeys/fireline-hybrid-user-journey-ledger.md` as the primary evaluation frame. The review should identify the subset of journeys that most strongly determine whether Fireline is already a viable workbench for the intended users.

The review should not treat every documented edge scenario as equally important. It should prioritize the journeys that represent the real business bar for product usefulness, such as:

- complaint or abnormal event intake,
- fragmented evidence intake and synthesis,
- RCA / CAPA / 8D progression,
- output generation for internal or external use,
- sustained case advancement toward closure.

### 2. Review Fireline as a journey-carrying product, not a feature list

The internal product review should evaluate whether a user can actually move from input to desired business outcome, not merely whether the UI contains related controls.

For each key journey, the review should determine:

- what the user is trying to accomplish,
- how far the current Fireline product can carry them,
- where the flow breaks,
- whether the break is a logic gap, workflow gap, trust gap, or experience gap.

### 3. Use the competitor scan as a maturity reference, not a product spec to copy

The Vantage 8D scan should examine how a real competitor structures the same problem space:

- information architecture,
- case and investigation organization,
- RCA / CAPA / 8D workflow support,
- output artifacts and handoff materials,
- collaboration and tracking signals,
- trust-building signals,
- onboarding and enterprise framing.

The competitor analysis should distinguish between:

- genuinely important strengths,
- features that matter because they improve journey completion,
- features that look sophisticated but do not materially change the core jobs.

### 4. End with a joined business judgment

The final review should not stop at observations. It should explicitly state:

- whether Fireline is already able to carry the intended core journeys,
- whether the current product is only partially viable,
- which 3–5 gaps are the most dangerous,
- which competitor strengths actually matter,
- which differences are low priority or not worth copying.

## Alternatives considered

### Option A — Journey-first review with competitor deep scan (recommended)
Use Fireline’s own committed user journeys as the primary evaluation frame, then use Vantage 8D to reveal maturity gaps and strategic differences.

- Pros: grounded in product intent, avoids cargo-culting competitor features, produces actionable product judgment.
- Cons: takes more analysis effort than a simple benchmark.

### Option B — Competitor-first benchmark
Start from Vantage 8D and compare Fireline mainly by feature/module parity.

- Pros: fast and easy to explain.
- Cons: can distort priorities and mistake competitor surface area for product truth.

### Option C — Internal-only journey review
Review Fireline only against internal user journeys with no real competitor scan.

- Pros: very focused.
- Cons: weak external calibration, less useful for judging severity of gaps.

## Output structure

### Layer 1: Executive business conclusion

A concise summary that states:

- whether Fireline currently satisfies the core target journeys,
- whether the product is viable, partially viable, or not yet viable for those journeys,
- the most important risks and product gaps,
- the most important competitor comparison conclusions.

### Layer 2: Journey-by-journey assessment

For each selected key journey, document:

- target user,
- intended job to be done,
- current Fireline support level,
- actual blocking points,
- Vantage 8D handling of the same job,
- gap type (`missing capability`, `workflow closure gap`, `trust/output quality gap`, `execution maturity gap`).

### Layer 3: Structured competitor scan appendix

Document Vantage 8D findings in a structured way, including:

- information architecture,
- major modules and navigation,
- workflow progression model,
- RCA / CAPA / 8D support,
- output and reporting behavior,
- trust and enterprise signals,
- notable strengths,
- notable weaknesses,
- lessons worth borrowing,
- differences not worth copying.

## Review criteria

The review should judge both Fireline and Vantage using these criteria:

1. **Journey completion**
   - Can the user actually reach the intended business outcome?
2. **Progression efficiency**
   - Does the product reduce thinking, sorting, and coordination burden?
3. **Output credibility**
   - Do outputs feel usable for real internal or external work?
4. **Workflow closure**
   - Does the product help advance and close a case, not just generate text?
5. **Competitive substitutability**
   - Could a serious buyer believe Fireline can replace Vantage 8D for core jobs?

## Inputs and evidence sources

### Internal evidence

- `docs/journeys/fireline-hybrid-user-journey-ledger.md`
- `docs/journeys/fireline-structured-scenarios.sample.json`
- current docs and recent commits
- current product behavior observed in the running app
- any relevant smoke/regression flows already present in the repo

### External evidence

- `https://www.vantage8d.com`
- authenticated product access using the credentials provided by the user
- screenshots, notes, and structured walkthrough observations

## Deliverable characteristics

The final review should be:

- evidence-based rather than impressionistic,
- explicit about what Fireline can and cannot yet do,
- explicit about which competitor advantages matter versus which are superficial,
- directly usable for roadmap and product judgment conversations.

## Scope boundaries and risk handling

- The competitor scan should stay focused on jobs relevant to Fireline’s actual product boundary.
- Credentials provided by the user are to be used only for the requested product review.
- The final review should distinguish verified observations from inferences.
- If parts of Vantage 8D are inaccessible, the review should note the limitation rather than guessing.

## Success criteria

This design is successful if the resulting review can clearly tell a product decision-maker:

- whether Fireline currently satisfies its most important target journeys,
- where exactly the current product fails or only partially succeeds,
- how Vantage 8D handles the same business jobs,
- which gaps should be considered truly urgent next steps.
