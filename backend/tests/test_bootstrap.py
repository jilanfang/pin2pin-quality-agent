from pathlib import Path


def test_backend_bootstrap_files_exist():
    assert Path("pyproject.toml").exists()
    assert Path("pytest.ini").exists()
    assert Path("app/__init__.py").exists()
