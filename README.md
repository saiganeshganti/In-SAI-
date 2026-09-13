# In SAI AI Recruiter

FastAPI-based AI recruiter application with search, talent pool and outreach features.

## Local setup

1. Create a virtual environment.
2. Install dependencies: `pip install -r requirements.txt`
3. Copy `.env.example` to `.env`.
4. Put your Gemini and Tavily API keys in `.env`.
5. Run: `uvicorn main:app --reload`
6. Open `http://127.0.0.1:8000`

## GitHub + public deployment

GitHub stores the source code; it does not run this FastAPI backend through GitHub Pages.
Connect this repository to a Python web host such as Render and add the two API keys as environment variables.

Never upload `.env` or API keys to GitHub.
