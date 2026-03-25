from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Case


def create_case(session: Session, title: str, mode: str = "normal") -> Case:
    case = Case(title=title, current_stage='D2', mode=mode, d1_status='missing')
    session.add(case)
    session.commit()
    session.refresh(case)
    return case


def list_cases(session: Session) -> list[Case]:
    return list(session.scalars(select(Case).order_by(Case.id.desc())))
