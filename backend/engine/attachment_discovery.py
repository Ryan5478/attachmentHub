"""Tavily-powered attachment discovery with caching, smart queries, and aggregator filtering."""

import os
import time
from typing import Dict, List, Optional
from urllib.parse import urlparse

from tavily import TavilyClient

from backend.engine.job_board_filter import (
    is_job_board,
    extract_company_from_url,
)

_client: Optional[TavilyClient] = None

# Simple in-memory cache. Resets when the process restarts — fine for MVP.
_cache: Dict[str, tuple] = {}
CACHE_TTL_SECONDS = 6 * 60 * 60  # 6 hours


def _get_client() -> TavilyClient:
    global _client
    if _client is None:
        api_key = os.environ.get("TAVILY_API_KEY")
        if not api_key:
            raise RuntimeError("TAVILY_API_KEY is not set")
        _client = TavilyClient(api_key=api_key)
    return _client


def _host(url: str) -> str:
    try:
        h = urlparse(url).netloc.lower()
        return h[4:] if h.startswith("www.") else h
    except Exception:
        return ""


def build_search_query(user_query: str, location: Optional[str] = None) -> str:
    """Build an effective Tavily query for attachment discovery.

    Uses OR-grouped synonyms to catch different regional wording, adds location,
    and nudges Tavily toward direct-from-company postings.
    """
    synonyms = (
        '("attachment" OR "internship" OR "industrial attachment" '
        'OR "placement" OR "work experience")'
    )
    loc = f' "{location}"' if location else ""
    intent = '("apply" OR "careers" OR "opportunity" OR "recruitment")'
    return f"{user_query} {synonyms}{loc} {intent}"


def _is_likely_attachment(title: str, snippet: str) -> bool:
    """Quick relevance filter to drop obvious non-attachment results."""
    text = (title + " " + snippet).lower()
    positive = [
        "attachment",
        "intern",
        "internship",
        "placement",
        "trainee",
        "graduate",
        "student",
        "industrial",
    ]
    negative = [
        "training course",
        "bootcamp",
        "certification",
        "online course",
        "udemy",
        "coursera",
        "certificate program",
    ]
    if any(n in text for n in negative):
        return False
    return any(p in text for p in positive)


def discover_attachments(
    query: str,
    location: Optional[str] = None,
    max_results: int = 20,
    use_cache: bool = True,
) -> Dict:
    """Search the web for attachments. Filters out aggregators. Caches by (query, location)."""
    cache_key = f"{(query or '').lower().strip()}|{(location or '').lower().strip()}|{max_results}"

    if use_cache:
        cached = _cache.get(cache_key)
        if cached:
            payload, ts = cached
            age = time.time() - ts
            if age < CACHE_TTL_SECONDS:
                payload = dict(payload)
                payload["cached"] = True
                payload["cache_age_seconds"] = int(age)
                return payload

    client = _get_client()
    enhanced = build_search_query(query, location)

    try:
        response = client.search(
            query=enhanced,
            max_results=max_results,
            search_depth="basic",  # 1 credit instead of 2
        )
    except Exception as e:
        raise RuntimeError(f"Tavily search failed: {e}") from e

    raw = response.get("results", []) or []

    kept: List[Dict] = []
    filtered = 0

    for r in raw:
        url = (r.get("url") or "").strip()
        if not url:
            continue

        if is_job_board(url):
            filtered += 1
            continue

        title = (r.get("title") or "").strip()
        snippet = (r.get("content") or "").strip()

        if not _is_likely_attachment(title, snippet):
            filtered += 1
            continue

        kept.append(
            {
                "title": title or "Untitled",
                "url": url,
                "company": extract_company_from_url(url),
                "snippet": snippet[:400],
                "source": _host(url),
            }
        )

    result = {
        "query": query,
        "location": location,
        "results": kept,
        "total_searched": len(raw),
        "filtered_out": filtered,
        "cached": False,
        "cache_age_seconds": 0,
    }

    if use_cache:
        _cache[cache_key] = (result, time.time())

    return result


def clear_cache() -> int:
    """Clear the discovery cache. Returns number of entries removed."""
    n = len(_cache)
    _cache.clear()
    return n
