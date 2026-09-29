"""Filters out job aggregator domains so only direct-company postings surface."""

from urllib.parse import urlparse

# Known job boards / aggregators to exclude
JOB_BOARD_DOMAINS = {
    "linkedin.com",
    "indeed.com",
    "indeed.co.uk",
    "indeed.ca",
    "indeed.com.au",
    "glassdoor.com",
    "glassdoor.co.uk",
    "ziprecruiter.com",
    "monster.com",
    "dice.com",
    "careerbuilder.com",
    "simplyhired.com",
    "wellfound.com",
    "angel.co",
    "builtin.com",
    "builtinsf.com",
    "builtinnyc.com",
    "builtinboston.com",
    "builtinaustin.com",
    "builtinchicago.com",
    "builtinla.com",
    "builtincolorado.com",
    "stackoverflow.com",
    "remote.co",
    "remoteok.com",
    "remoteok.io",
    "weworkremotely.com",
    "upwork.com",
    "freelancer.com",
    "toptal.com",
    "flexjobs.com",
    "jobs.com",
    "hired.com",
    "triplebyte.com",
    "ycombinator.com",
    "dribbble.com",
    "workingnomads.co",
    "jobspresso.co",
    "himalayas.app",
    "otta.com",
    "powertofly.com",
    "themuse.com",
    "idealist.org",
    "efinancialcareers.com",
    "jobcase.com",
    "snagajob.com",
    "getwork.com",
    "joblist.com",
}


def _normalize_host(url: str) -> str:
    try:
        host = urlparse(url).netloc.lower()
    except Exception:
        return ""
    if host.startswith("www."):
        host = host[4:]
    return host


def is_job_board(url: str) -> bool:
    """True if the URL belongs to a known job board or aggregator."""
    host = _normalize_host(url)
    if not host:
        return False
    for blocked in JOB_BOARD_DOMAINS:
        if host == blocked or host.endswith("." + blocked):
            return True
    return False


def extract_company_from_url(url: str) -> str:
    """Heuristic: 'jobs.stripe.com' -> 'Stripe', 'boards.greenhouse.io' -> ''."""
    host = _normalize_host(url)
    parts = host.split(".")
    if len(parts) < 2:
        return ""
    # Known ATS hosts where the subdomain is the actual domain
    ats_hosts = {
        "greenhouse.io",
        "lever.co",
        "ashbyhq.com",
        "workable.com",
        "smartrecruiters.com",
        "breezy.hr",
        "jobvite.com",
        "recruitee.com",
        "teamtailor.com",
    }
    base = ".".join(parts[-2:])
    if base in ats_hosts:
        # Example: boards.greenhouse.io/stripe -> handled at higher level
        return ""
    # Use the second-to-last part, capitalized: 'jobs.stripe.com' -> 'Stripe'
    name = parts[-2] if len(parts) >= 3 else parts[0]
    return name.capitalize()


# ---------------------------------------------------------------------------
# Attachment/internship-specific aggregators
# ---------------------------------------------------------------------------

ATTACHMENT_AGGREGATORS = {
    # East Africa
    "brightermonday.co.ke",
    "brightermonday.com",
    "brightermonday.ug",
    "fuzu.com",
    "fuzu.co.ke",
    "myjobmag.co.ke",
    "myjobmag.com",
    "myjobmag.co.ug",
    "jobwebkenya.com",
    "careerpointkenya.co.ke",
    "kenyajob.com",
    "jobsfund.com",
    "jobseastafrica.com",
    "kenyamoja.com",
    # Global internship boards
    "internshala.com",
    "letsintern.com",
    "hellointern.com",
    "chegg.com",
    "chegginternships.com",
    "wayup.com",
    "youtern.com",
    "looksharp.com",
    "aftercollege.com",
    "internmatch.com",
    "internships.com",
    # University career portals (aggregated, no direct info)
    "handshake.com",
    "joinhandshake.com",
    "symplicity.com",
    "12twenty.com",
    "gradleaders.com",
    # Country-specific boards
    "seek.com.au",
    "naukri.com",
    "reed.co.uk",
    "totaljobs.com",
    "stepstone.de",
    "jobs.ch",
}

# Union with the existing set
JOB_BOARD_DOMAINS = JOB_BOARD_DOMAINS | ATTACHMENT_AGGREGATORS
