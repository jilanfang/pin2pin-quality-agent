from fastapi.testclient import TestClient
from app.main import app


def test_healthcheck():
    client = TestClient(app)
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}


def test_healthcheck_allows_frontend_origin_for_local_dev():
    client = TestClient(app)
    response = client.get(
        '/health',
        headers={'Origin': 'http://localhost:3008'},
    )
    assert response.status_code == 200
    assert response.headers['access-control-allow-origin'] == 'http://localhost:3008'
