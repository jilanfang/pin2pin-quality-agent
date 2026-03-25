from fastapi.testclient import TestClient

from app.main import app


def test_create_case_returns_case_payload():
    client = TestClient(app)
    response = client.post('/cases', json={'title': 'Customer complaint case', 'mode': 'normal'})
    assert response.status_code == 200
    assert response.json()['title'] == 'Customer complaint case'
    assert response.json()['current_stage'] == 'D2'
    assert response.json()['mode'] == 'normal'
    assert response.json()['d1_status'] == 'missing'
