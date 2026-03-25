from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.cases import router as cases_router
from app.api.workflow import router as workflow_router
from app.db.session import init_db

init_db()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:3008',
        'http://127.0.0.1:3008',
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
app.include_router(cases_router)
app.include_router(workflow_router)


@app.get('/health')
def healthcheck() -> dict[str, str]:
    return {'status': 'ok'}
