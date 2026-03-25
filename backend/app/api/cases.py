from fastapi import APIRouter
from pydantic import BaseModel

from app.db.session import SessionLocal
from app.repositories.cases import create_case, list_cases
from app.repositories.stage_states import initialize_stage_records

router = APIRouter()


class CaseCreateRequest(BaseModel):
    title: str
    mode: str = "normal"


class CaseResponse(BaseModel):
    id: int
    title: str
    status: str
    current_stage: str
    mode: str
    d1_status: str


@router.post("/cases", response_model=CaseResponse)
def create_case_endpoint(payload: CaseCreateRequest) -> CaseResponse:
    with SessionLocal() as session:
        case = create_case(session, payload.title, mode=payload.mode)
        initialize_stage_records(session, case.id)
        return CaseResponse(
            id=case.id,
            title=case.title,
            status=case.status,
            current_stage=case.current_stage,
            mode=case.mode,
            d1_status=case.d1_status,
        )


@router.get("/cases", response_model=list[CaseResponse])
def list_cases_endpoint() -> list[CaseResponse]:
    with SessionLocal() as session:
        cases = list_cases(session)
        return [
            CaseResponse(
                id=case.id,
                title=case.title,
                status=case.status,
                current_stage=case.current_stage,
                mode=case.mode,
                d1_status=case.d1_status,
            )
            for case in cases
        ]
