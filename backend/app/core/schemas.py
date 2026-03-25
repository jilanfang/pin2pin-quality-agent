from typing import Literal

from pydantic import BaseModel


Stage = Literal['intake', 'fact_completion', 'analysis', 'draft_ready', 'user_revision']
WorkflowStage = Literal['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8']
ActiveWorkflowStage = Literal['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8']
D1Status = Literal['missing', 'partial', 'complete']
WorkflowMode = Literal['normal', 'mockup']
Priority = Literal['high', 'medium', 'low']
SectionStatus = Literal['confirmed', 'assumed', 'needs_validation']
FocusArea = Literal['D2', 'D3', 'D4', 'D5', 'D6', 'D7']
GenerationSource = Literal['llm', 'fallback']


class GenerationMeta(BaseModel):
    source: GenerationSource
    prompt_version: str
    domain_profile: str
    review_mode: str


class FactItem(BaseModel):
    field: str
    value: str
    confidence: float | None = None
    source: str | None = None


class GapItem(BaseModel):
    field: str
    reason: str
    priority: Priority


class AssumptionItem(BaseModel):
    statement: str
    needs_validation: bool = True


class OrchestrationResult(BaseModel):
    current_stage: Stage
    known_facts: list[FactItem]
    missing_fields: list[GapItem]
    assumptions: list[AssumptionItem]
    risk_flags: list[str]
    next_question: str | None = None
    should_generate_draft: bool = False
    force_advanced: bool = False


class DraftSection(BaseModel):
    section: str
    content: str
    status: SectionStatus


class DraftResult(BaseModel):
    case_id: str
    version: int
    sections: list[DraftSection]
    rendered_markdown: str
    generation_meta: GenerationMeta


class GuidedThinkingResult(BaseModel):
    focus_area: FocusArea
    thinking_goal: str
    guidance_text: str
    suggested_questions: list[str]
    checkpoints: list[str]
    warnings: list[str]


class StageRecordResponse(BaseModel):
    stage: WorkflowStage
    working_content: str
    confirmed_content: str
    locked: bool
    impacted: bool
    impact_summary: str | None = None
    last_reviewed_at: str | None = None


class DraftPreviewResponse(BaseModel):
    draft: DraftResult | None = None
    warnings: list[str]
    can_export: bool


class CaseWorkflowResponse(BaseModel):
    case_id: int
    current_stage: ActiveWorkflowStage
    mode: WorkflowMode
    d1_status: D1Status
    stages: list[StageRecordResponse]
    warnings: list[str]
    missing_fields: list[GapItem] = []
    guided_thinking: GuidedThinkingResult | None = None
    draft_preview: DraftPreviewResponse
