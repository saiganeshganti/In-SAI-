
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from tavily import TavilyClient
from google import genai
from google.genai import types
from dotenv import load_dotenv
from pathlib import Path
from typing import Optional
import os
import re
import json
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request
from urllib.parse import urljoin, quote
from html.parser import HTMLParser

from database import engine, SessionLocal, Base
from models import Candidate


# =========================================================
# ENVIRONMENT / API KEYS
# =========================================================

BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
STARTUPHUB_API_KEY = os.getenv("STARTUPHUB_API_KEY")
JINA_API_KEY = os.getenv("JINA_API_KEY")

print("========================================")
print("ENV FILE:", ENV_FILE)
print("ENV EXISTS:", ENV_FILE.exists())
print("GEMINI KEY LOADED:", bool(GEMINI_API_KEY))
print("TAVILY KEY LOADED:", bool(TAVILY_API_KEY))
print("STARTUPHUB KEY LOADED:", bool(STARTUPHUB_API_KEY))
print("JINA KEY LOADED:", bool(JINA_API_KEY))
print("========================================")


if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is not configured in .env"
    )

if not TAVILY_API_KEY:
    raise RuntimeError(
        "TAVILY_API_KEY is not configured in .env"
    )


# =========================================================
# API CLIENTS
# =========================================================

gemini_client = genai.Client(
    api_key=GEMINI_API_KEY
)

tavily_client = TavilyClient(
    api_key=TAVILY_API_KEY
)

# =========================================================
# DATABASE
# =========================================================

Base.metadata.create_all(
    bind=engine
)


# =========================================================
# EMAIL DISCOVERY FROM PUBLIC CONTACT INFORMATION
# =========================================================

EMAIL_PATTERN = re.compile(
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
)

EMAIL_CHECK_TIMEOUT = 15


def normalize_email(value):
    if not value:
        return None

    value = value.strip().strip("<>[](){}.,;:'\" ")
    match = EMAIL_PATTERN.search(value)

    if not match:
        return None

    return match.group(0).lower()


def extract_email_from_text(text):
    if not text:
        return None

    email = normalize_email(text)
    if email:
        return email

    normalized = text
    normalized = re.sub(
        r"\s*\[at\]\s*|\s*\(at\)\s*|\s+at\s+",
        "@",
        normalized,
        flags=re.I
    )
    normalized = re.sub(
        r"\s*\[dot\]\s*|\s*\(dot\)\s*|\s+dot\s+",
        ".",
        normalized,
        flags=re.I
    )

    return normalize_email(normalized)


def _fetch_public_page(url):
    """Read public contact/profile text only. No image downloading or OCR."""
    try:
        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/131.0 Safari/537.36"
                ),
                "Accept": (
                    "text/html,application/xhtml+xml,application/xml;"
                    "q=0.9,*/*;q=0.8"
                ),
            },
        )

        with urllib.request.urlopen(
            request,
            timeout=EMAIL_CHECK_TIMEOUT
        ) as response:
            content_type = response.headers.get("Content-Type", "")

            if "text/html" not in content_type.lower():
                return "", []

            raw = response.read(2_500_000)
            charset = (
                response.headers.get_content_charset()
                or "utf-8"
            )
            html = raw.decode(charset, errors="ignore")

        parser = _PublicContactParser()
        parser.feed(html)

        return " ".join(parser.text_parts), parser.mailto_urls

    except Exception as error:
        print("Public page email check error:", repr(error))
        return "", []


class _PublicContactParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.text_parts = []
        self.mailto_urls = []
        self._skip_depth = 0

    def handle_starttag(self, tag, attrs):
        attrs_dict = {
            key.lower(): value or ""
            for key, value in attrs
        }
        tag = tag.lower()

        if tag in {"script", "style", "noscript", "svg"}:
            self._skip_depth += 1
            return

        href = attrs_dict.get("href", "")
        if href.lower().startswith("mailto:"):
            self.mailto_urls.append(href)

    def handle_endtag(self, tag):
        if (
            tag.lower() in {"script", "style", "noscript", "svg"}
            and self._skip_depth
        ):
            self._skip_depth -= 1

    def handle_data(self, data):
        if not self._skip_depth and data.strip():
            self.text_parts.append(data.strip())


def _candidate_name_parts(name):
    clean_name = re.sub(r"\s+", " ", (name or "").strip())
    parts = clean_name.split(" ")

    if not parts:
        return "", ""

    if len(parts) == 1:
        return parts[0], ""

    return parts[0], " ".join(parts[1:])


def _candidate_domain(candidate):
    """Return a company domain when it can be safely derived from public data."""
    company = (candidate.get("company") or "").strip()
    content = candidate.get("content") or ""
    url = (candidate.get("url") or "").strip()

    # A normal public website URL is the safest domain source.
    if url and "linkedin.com/in/" not in url.lower():
        match = re.match(r"https?://(?:www\.)?([^/]+)", url, flags=re.I)
        if match:
            return match.group(1).lower()

    # Only accept an explicit website/domain-looking value from the result text.
    domain_matches = re.findall(
        r"\b(?:https?://)?(?:www\.)?([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b",
        content,
        flags=re.I
    )

    blocked = {
        "linkedin.com",
        "google.com",
        "facebook.com",
        "instagram.com",
        "twitter.com",
        "x.com",
        "youtube.com",
        "github.com",
    }

    for domain in domain_matches:
        domain = domain.lower().rstrip(".")
        if domain not in blocked:
            return domain

    # Do not guess a domain from the company name.
    return ""


def _email_belongs_to_candidate(email, candidate):
    """Reject obvious unrelated/company-only addresses when possible."""
    if not email:
        return None

    email = normalize_email(email)
    if not email:
        return None

    name = (candidate.get("title") or candidate.get("name") or "").lower()
    first_name, last_name = _candidate_name_parts(
        candidate.get("title") or candidate.get("name") or ""
    )
    first_name = re.sub(r"[^a-z0-9]", "", first_name.lower())
    last_name = re.sub(r"[^a-z0-9]", "", last_name.lower())
    local_part = email.split("@", 1)[0].lower()

    generic_local_parts = {
        "info", "contact", "hello", "support", "sales", "admin",
        "careers", "career", "jobs", "hr", "recruitment", "office",
        "enquiries", "inquiries", "team"
    }

    # Generic contact addresses are still legitimate contact information,
    # so keep them when they come directly from the candidate's public page.
    if local_part in generic_local_parts:
        return email

    compact_local = re.sub(r"[^a-z0-9]", "", local_part)
    if first_name and first_name in compact_local:
        return email
    if last_name and len(last_name) >= 3 and last_name in compact_local:
        return email

    # If the result is not a name-like title, do not reject a discovered email.
    if not name:
        return email

    # Do not over-filter. Public contact pages can use initials or abbreviations.
    return email


def _extract_candidate_email(text, candidate):
    email = extract_email_from_text(text)
    return _email_belongs_to_candidate(email, candidate)


def _startup_hub_email(candidate):
    """Ask StartupHub for a professional email using name + verified domain."""
    if not STARTUPHUB_API_KEY:
        return None

    first_name, last_name = _candidate_name_parts(
        candidate.get("title") or candidate.get("name") or ""
    )
    domain = _candidate_domain(candidate)

    if not first_name or not last_name or not domain:
        return None

    payload = json.dumps({
        "firstName": first_name,
        "lastName": last_name,
        "domain": domain
    }).encode("utf-8")

    request = urllib.request.Request(
        "https://www.startuphub.ai/api/v1/email/discover",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {STARTUPHUB_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "In-SAI-AI-Recruiter/1.5"
        }
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=EMAIL_CHECK_TIMEOUT
        ) as response:
            raw = response.read(500_000).decode("utf-8", errors="ignore")

        data = json.loads(raw) if raw else {}
        candidates = []

        if isinstance(data, dict):
            for key in ("email", "professionalEmail", "verifiedEmail"):
                value = data.get(key)
                if isinstance(value, str):
                    candidates.append(value)

            for key in ("data", "result", "contact"):
                nested = data.get(key)
                if isinstance(nested, dict):
                    for email_key in ("email", "professionalEmail", "verifiedEmail"):
                        value = nested.get(email_key)
                        if isinstance(value, str):
                            candidates.append(value)

        for value in candidates:
            email = _email_belongs_to_candidate(
                normalize_email(value), candidate
            )
            if email:
                print("Email found by StartupHub:", email)
                return email

    except Exception as error:
        print("StartupHub email check error:", repr(error))

    return None


def _jina_email_search(candidate):
    """Search public web pages for candidate-specific contact information."""
    if not JINA_API_KEY:
        return None

    name = (candidate.get("title") or candidate.get("name") or "").strip()
    if not name:
        return None

    role = (candidate.get("role") or "").strip()
    location = (candidate.get("location") or "").strip()

    query_parts = [f'"{name}"']
    if role:
        query_parts.append(f'"{role}"')
    if location:
        query_parts.append(f'"{location}"')
    query_parts.append("email contact")

    query = " ".join(query_parts)

    try:
        from urllib.parse import urlencode
        search_url = "https://s.jina.ai/" + quote(query, safe="")

        request = urllib.request.Request(
            search_url,
            headers={
                "Authorization": f"Bearer {JINA_API_KEY}",
                "Accept": "text/plain",
                "User-Agent": "In-SAI-AI-Recruiter/1.5"
            }
        )

        with urllib.request.urlopen(
            request,
            timeout=EMAIL_CHECK_TIMEOUT
        ) as response:
            content = response.read(2_500_000).decode(
                "utf-8",
                errors="ignore"
            )

        # Prefer emails that occur close to the candidate's name.
        email_matches = list(EMAIL_PATTERN.finditer(content))
        for match in email_matches:
            email = _email_belongs_to_candidate(
                match.group(0), candidate
            )
            if not email:
                continue

            window = content[max(0, match.start() - 800):match.end() + 800]
            if name.lower() in window.lower():
                print("Email found by Jina:", email)
                return email

        # If the search result itself is candidate-specific, accept the first
        # valid public email rather than inventing or constructing an address.
        for match in email_matches:
            email = _email_belongs_to_candidate(
                match.group(0), candidate
            )
            if email:
                print("Email found by Jina:", email)
                return email

    except Exception as error:
        print("Jina email search error:", repr(error))

    return None


def discover_candidate_email(candidate):
    """Run email discovery only after the candidate profile has been selected."""
    content = candidate.get("content") or ""

    # 1. Search-engine content already attached to the candidate.
    email = _extract_candidate_email(content, candidate)
    if email:
        print("Email found in candidate search content:", email)
        return email

    # 2. Read the candidate's public page/contact information.
    url = candidate.get("url") or ""
    if url and "linkedin.com/in/" not in url.lower():
        page_text, mailto_urls = _fetch_public_page(url)

        email = _extract_candidate_email(page_text, candidate)
        if email:
            print("Email found in public contact page:", email)
            return email

        for mailto in mailto_urls:
            email = _extract_candidate_email(
                mailto.replace("mailto:", "", 1),
                candidate
            )
            if email:
                print("Email found in mailto link:", email)
                return email

    # 3. StartupHub professional-email discovery.
    email = _startup_hub_email(candidate)
    if email:
        return email

    # 4. Jina public-web search fallback.
    email = _jina_email_search(candidate)
    if email:
        return email

    print("No public contact email found for:", url or candidate.get("title", ""))
    return None


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="In SAI AI Recruiter",
    description=(
        "AI-Powered Talent Discovery, "
        "Recruitment & Outreach."
    ),
    version="1.5.0"
)


# =========================================================
# STATIC FILES
# =========================================================

app.mount(
    "/static",
    StaticFiles(directory=str(BASE_DIR / "static")),
    name="static"
)


# =========================================================
# DATABASE SESSION
# =========================================================

def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# =========================================================
# REQUEST MODELS
# =========================================================

class RecruitmentRequest(BaseModel):
    role: str = ""

    skills: list[str] = Field(
        default_factory=list
    )

    location: str = ""
    region: str = ""
    state: str = ""
    city: str = ""
    experience: str = ""
    gender: str = ""

    # =====================================================
    # SEARCH SOURCES
    # =====================================================

    sources: list[str] = Field(
        default_factory=lambda: [
            "linkedin",
            "public_web"
        ]
    )


# =========================================================
# CANDIDATE CREATE MODEL
# =========================================================

class CandidateCreate(BaseModel):
    name: str
    email: str | None = None
    linkedin_url: str | None = None
    current_role: str | None = None
    company: str | None = None
    skills: str | None = None
    experience: str | None = None
    region: str | None = None
    state: str | None = None
    city: str | None = None
    location: str | None = None
    gender: str | None = None
    finance_category: str | None = None
    finance_subcategory: str | None = None
    status: str = "New"


# =========================================================
# CANDIDATE STATUS UPDATE MODEL
# =========================================================

class CandidateStatusUpdate(BaseModel):
    status: str


# =========================================================
# EMAIL GENERATION MODEL
# =========================================================

class EmailGenerationRequest(BaseModel):
    candidate_id: int
    email_type: str = "initial_outreach"
    tone: str = "professional"


# =========================================================
# HOME PAGE
# =========================================================

@app.get("/")
def home():
    return FileResponse(
        "templates/index.html"
    )


# =========================================================
# TALENT POOL PAGE
# =========================================================

@app.get("/talent-pool")
def talent_pool_page():
    return FileResponse(
        "templates/talent_pool.html"
    )


# =========================================================
# OUTREACH PAGE
# =========================================================

@app.get("/outreach")
def outreach_page():
    return FileResponse(
        "templates/outreach.html"
    )


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "application": "In SAI AI Recruiter",
        "gemini_configured": bool(GEMINI_API_KEY),
        "tavily_configured": bool(TAVILY_API_KEY),
        "startuphub_configured": bool(STARTUPHUB_API_KEY),
        "jina_configured": bool(JINA_API_KEY)
    }


# =========================================================
# TEXT HELPER
# =========================================================

def clean_text(value):
    if not value:
        return ""

    return value.strip()


# =========================================================
# LOCATION TERMS
# =========================================================

def build_location_terms(
    request: RecruitmentRequest
):
    locations = []

    if request.city.strip():
        locations.append(
            f'"{request.city.strip()}"'
        )

    if request.state.strip():
        locations.append(
            f'"{request.state.strip()}"'
        )

    if request.region.strip():
        locations.append(
            f'"{request.region.strip()}"'
        )

    if request.location.strip():
        locations.append(
            f'"{request.location.strip()}"'
        )

    return " ".join(locations)


# =========================================================
# FRESHER DETECTION
# =========================================================

def check_fresher_profile(
    title: str,
    content: str
):

    combined_text = (
        f"{title} {content}"
    ).lower()

    positive_keywords = [
        "fresher",
        "fresh graduate",
        "recent graduate",
        "recent college graduate",
        "entry level",
        "entry-level",
        "graduate trainee",
        "trainee",
        "student",
        "undergraduate",
        "final year student",
        "final-year student",
        "recently graduated",
        "new graduate",
        "first job",
        "looking for first job",
        "seeking first job",
        "seeking opportunities",
        "looking for opportunities",
        "open to work",
        "open-to-work",
        "no experience",
        "zero experience",
        "0 years experience",
        "0 years of experience",
        "career starter",
        "early career"
    ]

    strong_experience_words = [
        "senior",
        "team lead",
        "manager",
        "director",
        "head of"
    ]

    positive_matches = [
        keyword
        for keyword in positive_keywords
        if keyword in combined_text
    ]

    # -----------------------------------------------------
    # NUMERIC EXPERIENCE DETECTION
    # -----------------------------------------------------

    numeric_experience = re.findall(
        r"(\d+)\+?\s*(?:years?|yrs?)"
        r"\s*(?:of\s*)?experience",
        combined_text
    )

    for value in numeric_experience:

        try:
            years = int(value)

            if years >= 1:
                return False, positive_matches

        except ValueError:
            pass

    # -----------------------------------------------------
    # STRONG EXPERIENCE WORDS
    # -----------------------------------------------------

    if any(
        word in combined_text
        for word in strong_experience_words
    ):
        return False, positive_matches

    # -----------------------------------------------------
    # FRESHER MATCH
    # -----------------------------------------------------

    if positive_matches:
        return True, positive_matches

    return False, []


# =========================================================
# LOCATION MATCHING
# =========================================================

def location_matches_profile(
    request: RecruitmentRequest,
    title: str,
    content: str
):

    combined_text = (
        f"{title} {content}"
    ).lower()

    requested_locations = []

    if request.city.strip():
        requested_locations.append(
            request.city.strip().lower()
        )

    if request.state.strip():
        requested_locations.append(
            request.state.strip().lower()
        )

    if request.region.strip():
        requested_locations.append(
            request.region.strip().lower()
        )

    if request.location.strip():
        requested_locations.append(
            request.location.strip().lower()
        )

    # No location requested
    if not requested_locations:
        return True

    for location in requested_locations:

        if location in combined_text:
            return True

    return False


# =========================================================
# BUILD SOURCE-SPECIFIC SEARCH QUERIES
# =========================================================

def build_source_queries(
    request: RecruitmentRequest,
    role: str,
    skills_text: str,
    location_text: str,
    experience_text: str,
    gender_text: str
):

    queries = []

    # =====================================================
    # COMMON SEARCH TERMS
    # =====================================================

    common_parts = [
        f'"{role}"'
    ]

    if skills_text:

        common_parts.append(
            skills_text
        )

    if location_text:

        common_parts.append(
            location_text
        )

    if experience_text:

        common_parts.append(
            experience_text
        )

    if gender_text:

        common_parts.append(
            gender_text
        )

    common_query = " ".join(
        common_parts
    )

    # =====================================================
    # LINKEDIN SEARCH
    # =====================================================

    if "linkedin" in request.sources:

        linkedin_query = (
            "site:linkedin.com/in/ "
            + common_query
        )

        queries.append({
            "source": "LinkedIn",
            "query": linkedin_query
        })

    # =====================================================
    # PUBLIC WEB SEARCH
    # =====================================================

    if "public_web" in request.sources:

        public_query = (
            common_query
            + " "
            + "("
            '"profile" OR '
            '"portfolio" OR '
            '"resume" OR '
            '"CV" OR '
            '"about me" OR '
            '"professional"'
            ") "
            "-site:linkedin.com/in/"
        )

        queries.append({
            "source": "Public Web",
            "query": public_query
        })

    return queries


# =========================================================
# RECRUITMENT SEARCH
# =========================================================

@app.post("/recruit")
def recruit(
    request: RecruitmentRequest
):

    role = request.role.strip()

    if not role:
        role = "professional"

    # =====================================================
    # SKILLS
    # =====================================================

    skills = [
        skill.strip()
        for skill in request.skills
        if skill.strip()
    ]

    skills_text = " ".join(
        f'"{skill}"'
        for skill in skills
    )

    # =====================================================
    # LOCATION
    # =====================================================

    location_text = build_location_terms(
        request
    )

    # =====================================================
    # EXPERIENCE
    # =====================================================

    requested_experience = (
        request.experience
        .strip()
        .lower()
    )

    experience_terms = []

    # =====================================================
    # FRESHER
    # =====================================================

    if requested_experience == "fresher":

        experience_terms = [
            '"fresher"',
            '"fresh graduate"',
            '"recent graduate"',
            '"recent college graduate"',
            '"entry level"',
            '"entry-level"',
            '"graduate trainee"',
            '"trainee"',
            '"student"',
            '"undergraduate"',
            '"final year student"',
            '"new graduate"',
            '"recently graduated"',
            '"first job"',
            '"looking for first job"',
            '"seeking first job"',
            '"no experience"',
            '"0 years experience"',
            '"open to work"',
            '"seeking opportunities"',
            '"looking for opportunities"'
        ]

    # =====================================================
    # 0-2 YEARS
    # =====================================================

    elif requested_experience == "0-2 years":

        experience_terms = [
            '"entry level"',
            '"entry-level"',
            '"0-2 years"',
            '"0 years experience"',
            '"1 year experience"',
            '"2 years experience"',
            '"junior"',
            '"graduate"',
            '"early career"',
            '"trainee"',
            '"recent graduate"',
            '"fresher"'
        ]

    # =====================================================
    # 2-5 YEARS
    # =====================================================

    elif requested_experience == "2-5 years":

        experience_terms = [
            '"2 years experience"',
            '"3 years experience"',
            '"4 years experience"',
            '"5 years experience"'
        ]

    # =====================================================
    # 5+ YEARS
    # =====================================================

    elif requested_experience == "5+ years":

        experience_terms = [
            '"5 years experience"',
            '"6 years experience"',
            '"7 years experience"',
            '"8 years experience"',
            '"senior"'
        ]

    # =====================================================
    # OTHER EXPERIENCE
    # =====================================================

    elif requested_experience:

        experience_terms = [
            f'"{request.experience.strip()}"'
        ]

    # =====================================================
    # EXPERIENCE TEXT
    # =====================================================

    experience_text = ""

    if experience_terms:

        experience_text = (
            "("
            + " OR ".join(
                experience_terms
            )
            + ")"
        )

    # =====================================================
    # GENDER
    # =====================================================

    gender_text = ""

    if request.gender.strip():

        gender_text = (
            f'"{request.gender.strip()}"'
        )

    # =====================================================
    # BUILD SOURCE QUERIES
    # =====================================================

    source_queries = build_source_queries(
        request=request,
        role=role,
        skills_text=skills_text,
        location_text=location_text,
        experience_text=experience_text,
        gender_text=gender_text
    )

    # =====================================================
    # NO SOURCE SELECTED
    # =====================================================

    if not source_queries:

        return {
            "status": "error",
            "message":
                "Please select at least one search source.",
            "results": []
        }

    # =====================================================
    # SEARCH SELECTED SOURCES
    # =====================================================

    all_results = []

    for source_config in source_queries:

        source_name = source_config["source"]

        search_query = source_config["query"]

        print("")
        print("========================================")
        print("TAVILY SEARCH")
        print("SOURCE:", source_name)
        print("========================================")
        print(search_query)
        print("========================================")

        # =================================================
        # TAVILY SEARCH
        # =================================================

        try:

            response = tavily_client.search(
                query=search_query,
                max_results=30,
                search_depth="advanced",
                include_answer=False,
                include_raw_content=False
            )

        except Exception as error:

            print(
                "Tavily search error:",
                repr(error)
            )

            continue

        # =================================================
        # PROCESS RESULTS
        # =================================================

        for result in response.get(
            "results",
            []
        ):

            title = result.get(
                "title",
                ""
            )

            url = result.get(
                "url",
                ""
            )

            content = result.get(
                "content",
                ""
            )

            # -------------------------------------------------
            # BASIC URL VALIDATION
            # -------------------------------------------------

            if not url:
                continue

            url_lower = url.lower()

            # -------------------------------------------------
            # LINKEDIN SOURCE
            # -------------------------------------------------

            if source_name == "LinkedIn":

                if "linkedin.com/in/" not in url_lower:
                    continue

            # -------------------------------------------------
            # PUBLIC WEB SOURCE
            # -------------------------------------------------

            elif source_name == "Public Web":

                # LinkedIn results are kept in the LinkedIn
                # source and are not duplicated here.

                if "linkedin.com/in/" in url_lower:
                    continue

            # -------------------------------------------------
            # LOCATION FILTER
            # -------------------------------------------------

            if not location_matches_profile(
                request,
                title,
                content
            ):
                continue

            # -------------------------------------------------
            # FRESHER CHECK
            # -------------------------------------------------

            fresher_match, fresher_signals = (
                check_fresher_profile(
                    title,
                    content
                )
            )

            # -------------------------------------------------
            # STRICT FRESHER FILTER
            # -------------------------------------------------

            if requested_experience == "fresher":

                if not fresher_match:
                    continue

            # -------------------------------------------------
            # ADD RESULT
            # Email discovery is performed AFTER filtering and
            # de-duplication so we do not waste time inspecting
            # candidates that will never be returned.
            # -------------------------------------------------

            all_results.append({

                "title": title,

                "url": url,

                "content": content,

                "source": source_name,

                "location": (
                    request.city
                    or request.state
                    or request.region
                    or request.location
                ),

                "role": role,

                "skills": skills,

                "experience": request.experience,

                "fresher_match": fresher_match,

                "fresher_signals": fresher_signals,

                "email": None

            })

    # =====================================================
    # PRIORITIZE FRESHERS
    # =====================================================

    if requested_experience == "fresher":

        all_results.sort(
            key=lambda candidate:
            len(
                candidate.get(
                    "fresher_signals",
                    []
                )
            ),
            reverse=True
        )

    # =====================================================
    # PRIORITIZE LINKEDIN
    # =====================================================

    all_results.sort(
        key=lambda candidate:
        0
        if candidate.get("source") == "LinkedIn"
        else 1
    )

    # =====================================================
    # REMOVE DUPLICATES
    # =====================================================

    unique_results = []

    seen_urls = set()

    for result in all_results:

        url = result.get(
            "url",
            ""
        )

        if not url:
            continue

        normalized_url = (
            url
            .split("?")[0]
            .rstrip("/")
            .lower()
        )

        if normalized_url in seen_urls:
            continue

        seen_urls.add(
            normalized_url
        )

        unique_results.append(
            result
        )

    # =====================================================
    # LIMIT FINAL PROFILE RESULTS
    # =====================================================
    # Profile selection is completed before any email lookup.

    unique_results = unique_results[:20]

    # =====================================================
    # EMAIL DISCOVERY AFTER PROFILE SELECTION
    # =====================================================
    # Candidate profiles are collected, filtered and de-duplicated FIRST.
    # Only the final candidate list is checked for contact information.

    def _discover_email_for_result(result):
        return discover_candidate_email(result)

    if unique_results:
        worker_count = min(8, len(unique_results))

        with ThreadPoolExecutor(max_workers=worker_count) as executor:
            future_map = {
                executor.submit(
                    _discover_email_for_result,
                    result
                ): result
                for result in unique_results
            }

            for future in as_completed(future_map):
                result = future_map[future]

                try:
                    result["email"] = future.result()
                except Exception as error:
                    print(
                        "Email discovery error:",
                        repr(error)
                    )
                    result["email"] = None

    # =====================================================
    # REMOVE DUPLICATE EMAILS
    # =====================================================
    # Keep every unique profile. If two profiles produce the same email,
    # keep the first verified match and leave the later profile without an
    # email rather than deleting the profile from the search results.

    seen_emails = set()

    for result in unique_results:
        email = normalize_email(
            result.get("email")
        )

        if not email:
            result["email"] = None
            continue

        if email in seen_emails:
            print(
                "Duplicate email removed from candidate:",
                result.get("title", "")
            )
            result["email"] = None
            continue

        seen_emails.add(email)
        result["email"] = email

    # =====================================================
    # SOURCE COUNTS
    # =====================================================

    linkedin_count = sum(
        1
        for result in unique_results
        if result.get("source") == "LinkedIn"
    )

    public_web_count = sum(
        1
        for result in unique_results
        if result.get("source") == "Public Web"
    )

    # =====================================================
    # RESPONSE
    # =====================================================

    return {
        "status": "success",

        "requirements": {
            "role": request.role,
            "skills": request.skills,
            "location": request.location,
            "region": request.region,
            "state": request.state,
            "city": request.city,
            "experience": request.experience,
            "gender": request.gender
        },

        "sources": request.sources,

        "source_counts": {
            "linkedin": linkedin_count,
            "public_web": public_web_count,
            "total": len(unique_results)
        },

        "result_count": len(
            unique_results
        ),

        "results": unique_results
    }


# =========================================================
# ADD CANDIDATE TO TALENT POOL
# =========================================================

@app.post("/candidates")
def add_candidate(
    candidate: CandidateCreate,
    db: Session = Depends(get_db)
):

    # =====================================================
    # CHECK LINKEDIN DUPLICATE
    # =====================================================

    if candidate.linkedin_url:

        existing = (
            db.query(Candidate)
            .filter(
                Candidate.linkedin_url
                == candidate.linkedin_url
            )
            .first()
        )

        if existing:

            return {
                "status": "exists",
                "message":
                    "Candidate already exists in Talent Pool",
                "candidate_id":
                    existing.id
            }

    # =====================================================
    # CHECK EMAIL DUPLICATE
    # =====================================================

    if candidate.email:

        existing_email = (
            db.query(Candidate)
            .filter(
                Candidate.email
                == candidate.email
            )
            .first()
        )

        if existing_email:

            return {
                "status": "exists",
                "message":
                    "A candidate with this email already exists",
                "candidate_id":
                    existing_email.id
            }

    # =====================================================
    # CREATE CANDIDATE
    # =====================================================

    new_candidate = Candidate(
        name=candidate.name,
        email=candidate.email,
        linkedin_url=candidate.linkedin_url,
        current_role=candidate.current_role,
        company=candidate.company,
        skills=candidate.skills,
        experience=candidate.experience,
        region=candidate.region,
        state=candidate.state,
        city=candidate.city,
        location=candidate.location,
        gender=candidate.gender,
        finance_category=candidate.finance_category,
        finance_subcategory=
            candidate.finance_subcategory,
        status=candidate.status or "New"
    )

    try:

        db.add(
            new_candidate
        )

        db.commit()

        db.refresh(
            new_candidate
        )

    except IntegrityError:

        db.rollback()

        return {
            "status": "error",
            "message":
                "This candidate could not be added because of a database constraint."
        }

    return {
        "status": "success",
        "message":
            "Candidate added to Talent Pool",
        "candidate_id":
            new_candidate.id
    }


# =========================================================
# GET ALL TALENT POOL CANDIDATES
# =========================================================

@app.get("/candidates")
def get_candidates(
    region: Optional[str] = None,
    state: Optional[str] = None,
    city: Optional[str] = None,
    role: Optional[str] = None,
    experience: Optional[str] = None,
    gender: Optional[str] = None,
    finance_category: Optional[str] = None,
    finance_subcategory: Optional[str] = None,
    db: Session = Depends(get_db)
):

    query = db.query(
        Candidate
    )

    # -----------------------------------------------------
    # REGION
    # -----------------------------------------------------

    if region:

        query = query.filter(
            Candidate.region.ilike(
                f"%{region}%"
            )
        )

    # -----------------------------------------------------
    # STATE
    # -----------------------------------------------------

    if state:

        query = query.filter(
            Candidate.state.ilike(
                f"%{state}%"
            )
        )

    # -----------------------------------------------------
    # CITY
    # -----------------------------------------------------

    if city:

        query = query.filter(
            Candidate.city.ilike(
                f"%{city}%"
            )
        )

    # -----------------------------------------------------
    # ROLE
    # -----------------------------------------------------

    if role:

        query = query.filter(
            Candidate.current_role.ilike(
                f"%{role}%"
            )
        )

    # -----------------------------------------------------
    # EXPERIENCE
    # -----------------------------------------------------

    if experience:

        query = query.filter(
            Candidate.experience.ilike(
                f"%{experience}%"
            )
        )

    # -----------------------------------------------------
    # GENDER
    # -----------------------------------------------------

    if gender:

        query = query.filter(
            Candidate.gender.ilike(
                f"%{gender}%"
            )
        )

    # -----------------------------------------------------
    # FINANCE CATEGORY
    # -----------------------------------------------------

    if finance_category:

        query = query.filter(
            Candidate.finance_category.ilike(
                f"%{finance_category}%"
            )
        )

    # -----------------------------------------------------
    # FINANCE SPECIALIZATION
    # -----------------------------------------------------

    if finance_subcategory:

        query = query.filter(
            Candidate.finance_subcategory.ilike(
                f"%{finance_subcategory}%"
            )
        )

    # -----------------------------------------------------
    # LATEST FIRST
    # -----------------------------------------------------

    candidates = (
        query
        .order_by(
            Candidate.id.desc()
        )
        .all()
    )

    return candidates


# =========================================================
# GET SINGLE CANDIDATE
# =========================================================

@app.get("/candidates/{candidate_id}")
def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db)
):

    candidate = (
        db.query(Candidate)
        .filter(
            Candidate.id == candidate_id
        )
        .first()
    )

    if not candidate:

        return {
            "status": "error",
            "message":
                "Candidate not found"
        }

    return candidate


# =========================================================
# UPDATE CANDIDATE STATUS
# =========================================================

@app.patch(
    "/candidates/{candidate_id}/status"
)
def update_candidate_status(
    candidate_id: int,
    data: CandidateStatusUpdate,
    db: Session = Depends(get_db)
):

    candidate = (
        db.query(Candidate)
        .filter(
            Candidate.id == candidate_id
        )
        .first()
    )

    if not candidate:

        return {
            "status": "error",
            "message":
                "Candidate not found"
        }

    setattr(candidate, "status", data.status)

    db.commit()

    db.refresh(
        candidate
    )

    return {
        "status": "success",
        "message":
            "Candidate status updated",
        "candidate":
            candidate
    }


# =========================================================
# DELETE CANDIDATE
# =========================================================

@app.delete(
    "/candidates/{candidate_id}"
)
def delete_candidate(
    candidate_id: int,
    db: Session = Depends(get_db)
):

    candidate = (
        db.query(Candidate)
        .filter(
            Candidate.id == candidate_id
        )
        .first()
    )

    if not candidate:

        return {
            "status": "error",
            "message":
                "Candidate not found"
        }

    db.delete(
        candidate
    )

    db.commit()

    return {
        "status": "success",
        "message":
            "Candidate deleted successfully",
        "candidate_id":
            candidate_id
    }


# =========================================================
# AI EMAIL GENERATION - GEMINI 3.6 FLASH
# =========================================================

@app.post("/generate-email")
def generate_email(
    request: EmailGenerationRequest,
    db: Session = Depends(get_db)
):

    # =====================================================
    # FIND CANDIDATE
    # =====================================================

    candidate = (
        db.query(Candidate)
        .filter(
            Candidate.id == request.candidate_id
        )
        .first()
    )

    if not candidate:

        raise HTTPException(
            status_code=404,
            detail="Candidate not found"
        )

    # =====================================================
    # CANDIDATE INFORMATION
    # =====================================================

    name = str(candidate.name or "Candidate")

    role = str(
        candidate.current_role
        or "professional"
    )

    company = str(
        candidate.company
        or ""
    )

    skills = str(
        candidate.skills
        or ""
    )

    experience = str(
        candidate.experience
        or ""
    )

    location = str(
        candidate.city
        or candidate.state
        or candidate.region
        or candidate.location
        or ""
    )

    email_type = (
        request.email_type
        or "initial_outreach"
    )

    tone = (
        request.tone
        or "professional"
    )

    # =====================================================
    # REMOVE EMPTY / NOT PROVIDED VALUES
    # =====================================================

    profile_information = f"""
Candidate Name: {name}
Current Role: {role}
Current Company: {company if company else "Not provided"}
Skills: {skills if skills else "Not provided"}
Experience: {experience if experience else "Not provided"}
Location: {location if location else "Not provided"}
Email Type: {email_type}
Tone: {tone}
"""

    # =====================================================
    # PERSONALIZED GEMINI PROMPT
    # =====================================================

    prompt = f"""
You are a professional corporate recruiter working for
In SAI.

Create ONE highly personalized recruitment email for the
specific candidate below.

{profile_information}

IMPORTANT PERSONALIZATION RULES:

1. The subject MUST be specifically relevant to this
   candidate's actual profile.

2. The email body MUST be specifically relevant to this
   candidate's actual profile.

3. Do NOT create a generic email that could be sent to
   every candidate.

4. Use the candidate's actual role, skills, experience,
   company or location when those details are available
   and relevant.

5. If a piece of information is "Not provided", do not
   mention it.

6. Never invent:

   - education
   - qualifications
   - skills
   - experience
   - achievements
   - projects
   - job titles
   - companies
   - salary
   - responsibilities

7. Do not say the candidate applied for a job.

8. Do not exaggerate the candidate's background.

9. Address the candidate naturally by name.

10. Explain that In SAI is reaching out regarding a
    potential career opportunity.

11. Ask whether the candidate would be open to a brief
    conversation.

12. Keep the email professional, natural and concise.

13. Follow the selected email type:

    - initial_outreach
    - internship
    - interview
    - follow_up
    - shortlist

14. Follow the selected tone:

    - professional
    - formal
    - friendly
    - concise


SUBJECT REQUIREMENTS:

Create a new subject specifically for this candidate.

The subject should:

- sound professional
- be natural
- be concise
- normally contain 5-12 words
- relate to the candidate's profile
- relate to the selected email type
- mention In SAI when it sounds natural
- contain no emojis
- contain no clickbait
- contain no unnecessary punctuation

IMPORTANT:

Do NOT repeatedly use generic subjects such as:

"Career Opportunity"

"Job Opportunity"

"Exciting Opportunity"

"Great Opportunity"

Instead, make the subject depend on the candidate.

For example, if the candidate is an HR professional,
the subject could focus on HR.

If the candidate has finance experience,
the subject could focus on finance.

If the candidate is a marketing professional,
the subject could focus on marketing.

These are examples only.

Do NOT copy them automatically.


EMAIL BODY:

Write a completely new email for this candidate.

The email should:

- Address {name}
- Reference relevant candidate information
- Explain why In SAI is contacting them
- Match the selected email type
- Match the requested tone
- Sound like a real recruiter
- Remain concise
- Ask for a brief conversation

The email must end exactly with:

Best regards,

Ganesh

In SAI AI Recruiter


OUTPUT:

Return ONLY valid JSON.

Do not use Markdown.

Do not use code fences.

Do not add explanations.

Return exactly:

{{
    "subject": "candidate-specific professional subject",
    "body": "candidate-specific professional email body"
}}
"""

    # =====================================================
    # GEMINI 3.6 FLASH GENERATION
    # =====================================================

    try:

        print("")
        print("========================================")
        print("GEMINI EMAIL GENERATION")
        print("========================================")
        print("Candidate ID:", candidate.id)
        print("Candidate:", name)
        print("Role:", role)
        print("Skills:", skills)
        print("Experience:", experience)
        print("Email Type:", email_type)
        print("Tone:", tone)
        print("Model: gemini-3.6-flash")
        print("========================================")

        response = gemini_client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(
                    thinking_level=types.ThinkingLevel.MINIMAL
                ),
                max_output_tokens=500
            )
        )

        generated_text = ""

        if response:

            generated_text = (
                response.text
                or ""
            )

        generated_text = generated_text.strip()

        if not generated_text:

            raise Exception(
                "Gemini returned an empty response."
            )

        print("")
        print("========================================")
        print("RAW GEMINI RESPONSE")
        print("========================================")
        print(generated_text)
        print("========================================")

        # =================================================
        # REMOVE MARKDOWN CODE FENCES
        # =================================================

        generated_text = re.sub(
            r"^\s*```json\s*",
            "",
            generated_text,
            flags=re.IGNORECASE
        )

        generated_text = re.sub(
            r"^\s*```\s*",
            "",
            generated_text
        )

        generated_text = re.sub(
            r"\s*```\s*$",
            "",
            generated_text
        )

        generated_text = generated_text.strip()

        # =================================================
        # PARSE JSON
        # =================================================

        try:

            email_data = json.loads(
                generated_text
            )

        except json.JSONDecodeError:

            print(
                "Gemini returned invalid JSON."
            )

            raise Exception(
                "Gemini did not return valid JSON."
            )

        # =================================================
        # GET SUBJECT
        # =================================================

        subject = str(
            email_data.get(
                "subject",
                ""
            )
        ).strip()

        # =================================================
        # GET BODY
        # =================================================

        body = str(
            email_data.get(
                "body",
                ""
            )
        ).strip()

        # =================================================
        # VALIDATION
        # =================================================

        if not subject:

            raise Exception(
                "Gemini generated an empty subject."
            )

        if not body:

            raise Exception(
                "Gemini generated an empty email body."
            )

        # =================================================
        # SUCCESS
        # =================================================

        print("")
        print("========================================")
        print("EMAIL GENERATED SUCCESSFULLY")
        print("========================================")
        print("SUBJECT:")
        print(subject)
        print("")
        print("BODY:")
        print(body)
        print("========================================")

        return {
            "status": "success",

            "subject": subject,

            "body": body,

            "email": body,

            "candidate": {
                "id": candidate.id,
                "name": name,
                "email": candidate.email,
                "role": role,
                "company": company,
                "skills": skills,
                "experience": experience,
                "location": location
            }
        }

    # =====================================================
    # ERROR HANDLING
    # =====================================================

    except Exception as error:

        print("")
        print("========================================")
        print("GEMINI EMAIL GENERATION ERROR")
        print("========================================")

        print(
            "Error Type:",
            type(error).__name__
        )

        print(
            "Error:",
            repr(error)
        )

        print("========================================")

        raise HTTPException(
            status_code=500,
            detail=(
                "AI email generation failed. "
                "Check the terminal for the exact Gemini error."
            )
        )