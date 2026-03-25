from app.core.schemas import CaseWorkflowResponse, DraftPreviewResponse, GapItem, GuidedThinkingResult, StageRecordResponse


def test_case_workflow_response_supports_stage_driven_shape():
    result = CaseWorkflowResponse(
        case_id=1,
        current_stage='D2',
        mode='normal',
        d1_status='missing',
        stages=[
            StageRecordResponse(
                stage='D2',
                working_content='draft',
                confirmed_content='',
                locked=False,
                impacted=False,
                impact_summary=None,
                last_reviewed_at=None,
            )
        ],
        warnings=['D1 未填写'],
        missing_fields=[
            GapItem(field='impact', reason='缺少影响范围', priority='high'),
        ],
        guided_thinking=GuidedThinkingResult(
            focus_area='D3',
            thinking_goal='Help the user define containment actions.',
            guidance_text='Clarify isolation scope and customer protection actions.',
            suggested_questions=['What inventory and shipment scope is contained?'],
            checkpoints=['Containment should include WIP, stock, shipment, and customer site.'],
            warnings=['Information is insufficient for D3 confirmation.'],
        ),
        draft_preview=DraftPreviewResponse(
            draft=None,
            warnings=['D1 未填写'],
            can_export=False,
        ),
    )
    assert result.current_stage == 'D2'
    assert result.missing_fields[0].field == 'impact'
    assert result.guided_thinking is not None
    assert result.guided_thinking.focus_area == 'D3'
    assert result.draft_preview.can_export is False


from app.core.schemas import GenerationMeta


def test_guided_thinking_result_supports_prompt_contract():
    result = GuidedThinkingResult(
        focus_area='D4',
        thinking_goal='Help the user move from symptom to candidate causes.',
        guidance_text='Please separate observed facts from cause hypotheses.',
        suggested_questions=['What evidence supports each candidate cause?'],
        checkpoints=['Do not state an unverified cause as confirmed root cause.'],
        warnings=['Evidence is currently insufficient for a final root cause.'],
    )
    assert result.focus_area == 'D4'
    assert len(result.suggested_questions) == 1


def test_generation_meta_supports_draft_traceability():
    meta = GenerationMeta(
        source='fallback',
        prompt_version='draft-generator-v2',
        domain_profile='electronics_quality_engineer_v1',
        review_mode='mvp_pre_expert_review',
    )
    assert meta.source == 'fallback'
