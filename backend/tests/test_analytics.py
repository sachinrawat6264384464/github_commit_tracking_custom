import datetime
from app.models import Repository, Contributor, Commit
from app.services.analytics_service import AnalyticsService


def test_analytics_metrics_and_trends(test_db):
    # Setup test repo
    repo = Repository(
        owner="facebook",
        name="react",
        full_name="facebook/react",
        visibility="public",
        default_branch="main",
    )
    test_db.add(repo)
    test_db.commit()

    # Setup contributor
    contrib = Contributor(
        github_login="gaearon",
        display_name="Dan Abramov",
        normalized_email="dan@example.com",
    )
    test_db.add(contrib)
    test_db.commit()

    # Add commits
    now = datetime.datetime.utcnow()
    c1 = Commit(
        repository_id=repo.id,
        contributor_id=contrib.id,
        sha="abc1234567890",
        message="feat: improve hooks",
        author_name="Dan Abramov",
        committed_at=now,
        is_merge_commit=False,
    )
    c2 = Commit(
        repository_id=repo.id,
        contributor_id=contrib.id,
        sha="def9876543210",
        message="Merge pull request #123",
        author_name="Dan Abramov",
        committed_at=now - datetime.timedelta(days=2),
        is_merge_commit=True,
    )
    test_db.add_all([c1, c2])
    test_db.commit()

    service = AnalyticsService(test_db)

    # Overview
    overview = service.get_overview_metrics()
    assert overview.total_repositories == 1
    assert overview.total_tracked_commits == 2
    assert overview.total_contributors == 1
    assert overview.commits_today == 1

    # Trends without merge commits
    trends = service.get_commit_trends(days=7, include_merges=False)
    assert trends.total_in_period == 1

    # Trends with merge commits
    trends_all = service.get_commit_trends(days=7, include_merges=True)
    assert trends_all.total_in_period == 2

    # Repository distribution
    dist = service.get_repository_distribution(days=30, include_merges=True)
    assert len(dist) == 1
    assert dist[0].name == "react"
    assert dist[0].commit_count == 2
    assert dist[0].percentage == 100.0

    # Contributor leaderboard
    leaderboard = service.get_contributor_leaderboard(days=30, include_merges=True)
    assert len(leaderboard) == 1
    assert leaderboard[0].name == "Dan Abramov"
    assert leaderboard[0].commit_count == 2
