import datetime
import pytest
from sqlalchemy.exc import IntegrityError
from app.models import Repository, Contributor, Commit


def test_repository_creation(test_db):
    repo = Repository(
        owner="octocat",
        name="Hello-World",
        full_name="octocat/hello-world",
        visibility="public",
        default_branch="master",
    )
    test_db.add(repo)
    test_db.commit()
    test_db.refresh(repo)

    assert repo.id is not None
    assert repo.full_name == "octocat/hello-world"
    assert repo.sync_status == "pending"


def test_commit_deduplication_constraint(test_db):
    repo = Repository(
        owner="octocat",
        name="Hello-World",
        full_name="octocat/hello-world",
        default_branch="master",
    )
    test_db.add(repo)
    test_db.commit()

    c1 = Commit(
        repository_id=repo.id,
        sha="7fd1a60b01f91b314f59955a4e4d4e80d8edf11d",
        message="Initial commit",
        author_name="Mona Lisa Octocat",
        committed_at=datetime.datetime.utcnow(),
    )
    test_db.add(c1)
    test_db.commit()

    # Attempt inserting identical (repository_id, sha)
    c2 = Commit(
        repository_id=repo.id,
        sha="7fd1a60b01f91b314f59955a4e4d4e80d8edf11d",
        message="Duplicate commit attempt",
        author_name="Mona Lisa Octocat",
        committed_at=datetime.datetime.utcnow(),
    )
    test_db.add(c2)
    with pytest.raises(IntegrityError):
        test_db.commit()
    test_db.rollback()


def test_contributor_resolution(test_db):
    contrib = Contributor(
        github_user_id=583231,
        github_login="octocat",
        display_name="Mona Lisa Octocat",
        normalized_email="octocat@github.com",
    )
    test_db.add(contrib)
    test_db.commit()

    assert contrib.id is not None
    assert contrib.github_login == "octocat"
