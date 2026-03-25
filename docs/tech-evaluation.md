# AI Quality MVP Technical Review and Plan

> Goal: align the technical approach with the lowest viable MVP for `8D Copilot`, focusing on Phase 0 and Phase 1 only.

---

## 1. Product Baseline

Based on the current product docs, the MVP is not a generic AI platform. It is a narrow workflow tool for one high-pressure job:

`collect messy case inputs -> summarize facts -> identify gaps -> ask one key next question -> generate a deliverable 8D draft`

The core success bar for MVP is:

- a junior engineer can get to a usable 8D first draft in 10-20 minutes
- the draft clearly separates facts, assumptions, and actions
- the system surfaces what still needs validation
- the interaction feels like guided case handling, not generic text generation

Relevant references:

- `docs/prd.md`
- `docs/ai-agent-design.md`

---

## 2. Review of the Previous Technical Direction

The previous technical proposal was directionally thoughtful, but too heavy for MVP.

### 2.1 What was oversized for MVP

The earlier version introduced too many platform-level concerns too early:

- full document-ingestion matrix
- RAG and vector database
- model routing and multi-model abstraction
- formal evaluation stack
- async queue infrastructure
- observability platform
- enterprise-ready backend framing

These are valid later-stage topics, but they are not required to validate the first product loop.

### 2.2 What the technical plan should optimize for instead

For Phase 0 and Phase 1, the system should optimize for:

- fast iteration on the agent workflow
- reliable structured outputs
- simple storage of cases and drafts
- low operational overhead
- easy prompt and schema tuning

In short: we need a working case copilot, not an AI platform.

---

## 3. MVP Scope Definition

## 3.1 Phase 0: Lowest Viable MVP

Phase 0 is the smallest version worth shipping to early users.

### User scope

- user starts a new case
- user pastes fragmented text materials
- system extracts known facts
- system identifies missing high-priority fields
- system asks one next question at a time
- system generates an 8D first draft
- user can edit and regenerate

### Input scope

Support in Phase 0:

- pasted text
- typed notes
- copied chat logs
- test observations entered manually

Do not support in Phase 0:

- PDF parsing pipeline
- Excel ingestion
- OCR pipeline
- enterprise connectors

### Output scope

Support in Phase 0:

- structured case summary
- known facts
- missing information list
- candidate analysis notes
- one 8D draft

Not required in Phase 0:

- separate internal vs customer output modes
- concise vs full draft switching
- advanced report export engine

## 3.2 Phase 1: Immediate Follow-up

Phase 1 strengthens the same workflow without changing the product shape.

### Add in Phase 1

- image upload routed directly to a multimodal model
- better gap prioritization and question sequencing
- explicit fact / assumption / needs-validation tagging
- draft revision loop after user edits
- lightweight case history view

### Still avoid in Phase 1

- RAG
- vector database
- training / fine-tuning
- queue infrastructure unless latency forces it
- enterprise auth and permissions

---

## 4. Recommended Architecture for Phase 0 + 1

## 4.1 System Shape

Use a simple single-product architecture:

- web frontend
- one backend service
- one LLM integration layer with provider adapters
- one relational database

This is enough for early validation.

## 4.2 High-Level Flow

1. User creates or opens a case
2. User submits text, and later images in Phase 1
3. Backend stores raw inputs
4. Extractor prompt converts raw input into structured facts
5. Orchestrator decides whether to ask a question or generate a draft
6. Generator produces summary, analysis guidance, and 8D draft
7. User edits and continues the loop

## 4.3 Core Modules

### A. Case Intake

Responsibilities:

- receive user messages and attachments
- persist raw input
- normalize basic metadata

### B. Fact Extractor

Responsibilities:

- extract structured facts from messy input
- separate user-stated facts from model inference
- mark missing required fields

### C. Dialogue Orchestrator

Responsibilities:

- determine current case stage
- select the single highest-priority next question
- decide when analysis can begin
- decide when draft generation is allowed

### D. Analysis Coach

Responsibilities:

- produce lightweight fishbone-style prompts in text
- drive 5 Why style reasoning carefully
- warn when evidence is insufficient

### E. 8D Draft Generator

Responsibilities:

- produce D1-D8 structured draft output
- label uncertain areas
- preserve traceability to known facts

### F. Case Store

Responsibilities:

- store cases
- store message history
- store extracted fact snapshots
- store draft versions

### G. LLM Adapter Layer

Responsibilities:

- expose task-based model calls instead of provider-specific SDK calls
- support multiple providers and multiple model tiers
- centralize routing, fallback, and upgrade rules
- normalize responses and error formats
- record usage and cost metadata

---

## 5. Data Model Recommendation

Keep the schema intentionally small.

### 5.1 Core tables

`cases`

- id
- title
- status
- current_stage
- created_at
- updated_at

`messages`

- id
- case_id
- role
- content
- message_type
- created_at

`artifacts`

- id
- case_id
- artifact_type
- storage_path or blob_ref
- extracted_text
- created_at

`fact_snapshots`

- id
- case_id
- facts_json
- gaps_json
- assumptions_json
- created_at

`drafts`

- id
- case_id
- draft_type
- content_json
- rendered_markdown
- created_at

### 5.2 Why this is enough

This schema supports:

- persistent cases
- structured extraction
- iterative prompting
- draft history

without introducing unnecessary complexity.

---

## 6. Technology Choices

## 6.1 Backend

Recommendation: choose one backend stack and keep everything in it.

Two valid options:

- Python + FastAPI
- Node.js + TypeScript

Decision rule:

- choose Python if the team wants faster experimentation around prompts, schemas, and multimodal processing
- choose Node.js if there is already a real application codebase there and execution speed matters more than ML ergonomics

For this project's current state, Python + FastAPI is the clearer MVP default.

Why:

- easier fit for structured LLM workflows
- good ecosystem for data validation
- easy future path for multimodal and document tooling

## 6.2 Frontend

Recommendation:

- React + TypeScript
- simple chat-first interface
- markdown rendering for summaries and drafts

Must-have UI surfaces:

- case list or recent cases
- chat thread
- structured summary panel
- draft panel

## 6.3 Database

Recommendation:

- SQLite for local prototyping
- Postgres when moving beyond single-user prototype

Do not introduce Redis in Phase 0.

## 6.4 LLM Integration

Recommendation:

- connect directly to one strong primary model first
- keep prompts and schemas in application code or local config

Do not require in Phase 0:

- LiteLLM proxy
- multi-model routing
- local model hosting

Those can be added later once traffic, cost, or compliance requires them.

---

## 6.5 Recommended Backend Structure

Suggested Phase 0 backend layout:

```text
backend/
  app/
    main.py
    api/
      cases.py
      chat.py
      drafts.py
    core/
      config.py
      logging.py
      schemas.py
    db/
      models.py
      session.py
    repositories/
      cases.py
      messages.py
      drafts.py
      fact_snapshots.py
    services/
      llm_client.py
      extractor.py
      orchestrator.py
      draft_generator.py
```

Design principle:

- keep request handling thin in API routes
- keep business workflow in services
- keep persistence isolated in repositories
- keep all structured contracts in schemas

This makes the agent workflow easy to test and tune.

---

## 7. Input Handling Strategy

## 7.1 Phase 0

Only support text-first intake.

Sources may include:

- pasted customer complaint
- pasted internal notes
- copied WeChat or email conversation
- manually entered failure observations

The system should treat these as raw case evidence and extract structure from them.

## 7.2 Phase 1

Add image support by sending images directly to a multimodal model.

This avoids building a separate OCR and image-processing pipeline too early.

Recommended Phase 1 behavior:

- store uploaded image
- pass image plus current case context to model
- extract visible facts conservatively
- ask user to confirm important extracted details

## 7.3 What to postpone

Postpone these until repeated user demand proves they matter:

- PDF parsing quality routing
- Excel parsing
- OCR engine selection
- document chunking pipeline
- metadata extraction framework

---

## 8. Agent Workflow Design

The main technical challenge is not parsing files. It is controlling the workflow.

## 8.1 Stage model

Recommended stages:

- `intake`
- `fact_completion`
- `analysis`
- `draft_ready`
- `user_revision`

## 8.2 Minimum structured outputs

Every extractor/orchestrator call should return machine-usable structure:

```json
{
  "known_facts": [],
  "missing_fields": [],
  "assumptions": [],
  "risk_flags": [],
  "next_recommended_question": "",
  "current_stage": "fact_completion"
}
```

This is more important than adding more infrastructure.

## 8.3 Guardrails

Required MVP rules:

- never state unverified causes as confirmed root causes
- distinguish facts from hypotheses
- distinguish containment from corrective action
- block premature certainty when evidence is thin

These rules should be enforced through prompt instructions plus output validation.

---

## 8.4 Suggested API Surface

Phase 0 only needs a small API surface:

`POST /cases`

- create a new case

`GET /cases`

- list recent cases

`GET /cases/{case_id}`

- return case metadata, latest stage, latest fact snapshot, latest draft

`POST /cases/{case_id}/messages`

- save a user message
- trigger extraction and orchestration
- return the next question or a generated draft

`GET /cases/{case_id}/timeline`

- return message history and stage transitions

`GET /cases/{case_id}/draft`

- return the latest generated draft

`POST /cases/{case_id}/draft/regenerate`

- regenerate draft from latest case state

The most important endpoint is `POST /cases/{case_id}/messages`, because it drives the main user loop.

## 8.5 Suggested Response Contract

Each message-processing call should return a stable structure like:

```json
{
  "case_id": "case_123",
  "stage": "fact_completion",
  "known_facts": [],
  "missing_fields": [],
  "assumptions": [],
  "risk_flags": [],
  "next_question": "What batch and date was this issue first found?",
  "draft": null
}
```

This keeps the frontend simple and avoids hidden state in the UI layer.

---

## 9. Pydantic Schema Direction

The backend should prefer explicit schemas over loose dictionaries.

Suggested core models:

- `FactItem`
  - `field`
  - `value`
  - `confidence`
  - `source`
- `GapItem`
  - `field`
  - `reason`
  - `priority`
- `AssumptionItem`
  - `statement`
  - `needs_validation`
- `OrchestrationResult`
  - `current_stage`
  - `known_facts`
  - `missing_fields`
  - `assumptions`
  - `risk_flags`
  - `next_question`
  - `should_generate_draft`
- `DraftSection`
  - `section`
  - `content`
  - `status`
- `DraftResult`
  - `case_id`
  - `version`
  - `sections`
  - `rendered_markdown`

Why this matters:

- prompt outputs become machine-checkable
- UI rendering becomes deterministic
- workflow bugs become easier to spot

---

## 10. Evaluation Strategy for MVP

Do not start with a formal AI evaluation platform.

Use a lightweight product evaluation loop instead.

## 10.1 Golden case set

Create a small set of representative cases, for example:

- customer complaint with incomplete info
- internal test failure with unclear cause
- mixed chat-log style input
- evidence-thin scenario that should remain provisional

## 10.2 Review dimensions

For each case, score:

- did the summary preserve key facts
- did the system ask the right next question
- did it avoid fake certainty
- was the 8D draft usable
- how much manual fixing was still needed

## 10.3 Success criteria

Phase 0 is good enough when:

- most test cases produce a recognizable 8D structure
- major facts are not lost
- invalid certainty is rare
- users feel the draft is worth editing instead of rewriting from scratch

---

## 11. What to Keep, Delay, and Remove

## 11.1 Keep now

- chat-first frontend
- single backend service
- structured schema validation
- one-model integration
- relational data store
- streaming responses
- basic logs

## 11.2 Delay to later phase

- LiteLLM
- LangFuse
- case templates
- richer export formats
- advanced image handling
- operational dashboards

## 11.3 Remove from MVP scope

- RAG
- Qdrant or other vector databases
- reranking stack
- fine-tuning pipeline
- ML experiment tracking
- Redis/Celery task system
- formal hallucination evaluation suite
- enterprise auth/integration scope

---

## 12. Recommended Build Order

## 12.1 Phase 0

1. FastAPI project skeleton and configuration
2. SQLite models for cases, messages, fact snapshots, and drafts
3. `POST /cases` and `GET /cases`
4. `POST /cases/{case_id}/messages`
5. extractor schema and parser validation
6. single-question orchestration
7. D1-D8 draft generation
8. draft retrieval and regeneration
9. golden-case manual review

## 12.2 Phase 1

1. image upload support
2. multimodal fact extraction
3. stronger gap prioritization
4. fact / assumption / pending-validation labels
5. case history browsing
6. prompt and output tuning from real usage

---

## 13. Final Recommendation

The right technical strategy for this project is not to build a broad AI quality platform first.

It is to build a narrow, reliable, guided 8D copilot with:

- simple architecture
- explicit workflow stages
- structured outputs
- conservative reasoning
- low operational burden

If we keep Phase 0 and Phase 1 disciplined, we will learn faster, ship faster, and preserve the option to add heavier infrastructure later only when the product truly earns it.
