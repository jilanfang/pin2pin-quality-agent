from sqlalchemy.orm import Session

from app.db.models import Message


def create_message(
    session: Session,
    case_id: int,
    content: str,
    role: str = "user",
    message_type: str = "raw_input",
) -> Message:
    message = Message(
        case_id=case_id,
        role=role,
        content=content,
        message_type=message_type,
    )
    session.add(message)
    session.commit()
    session.refresh(message)
    return message
