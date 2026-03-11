from pydantic import BaseModel, ConfigDict, Field, EmailStr
from typing import List, Optional
from datetime import date

class UserQuestionRequest(BaseModel):
    prompt : str

class UserQuestionResponse(BaseModel):
    model_config = ConfigDict(extra="allow")


# ─── Structured Visualisation Schema ───
# Used with Gemini's structured output to guarantee valid JSON responses

class ExplanationBlock(BaseModel):
    heading: str = Field(description="Short heading for the explanation section, e.g. 'How It Works'")
    code: str = Field(description="Python-style pseudocode explaining the concept. Use \\n for newlines, # for comments.")
    result: Optional[str] = Field(default=None, description="Key takeaway, final output, or formula")

class KeyPoint(BaseModel):
    title: str = Field(description="1-3 word title for the key concept")
    text: str = Field(description="1-2 sentence explanation of the concept")

class Example(BaseModel):
    label: Optional[str] = Field(default=None, description="Label for the example, e.g. 'Example 1'")
    input: str = Field(description="Example input")
    output: str = Field(description="Expected output")

class VisualisationResponse(BaseModel):
    title: str = Field(description="Short descriptive title of the concept being visualised")
    diagram: str = Field(description=(
        "Valid Mermaid.js diagram code. Choose the best type: "
        "flowchart TD/LR (for algorithms, processes, decisions), "
        "sequenceDiagram (for component interactions, API flows), "
        "classDiagram (for OOP design, domain models), or "
        "stateDiagram-v2 (for state machines, lifecycles). "
        "ALWAYS quote all node labels: A[\"Label\"], B{{\"Decision\"}}. "
        "Use \\n to separate lines. Keep to 4-10 nodes."
    ))
    explanation: Optional[ExplanationBlock] = Field(default=None, description="Code explanation block with pseudocode")
    keyPoints: Optional[List[KeyPoint]] = Field(default=None, description="2-3 key concepts that aid understanding")
    examples: Optional[List[Example]] = Field(default=None, description="Concrete examples with input/output, only if pedagogically useful")

class SyllabusRequest(BaseModel):
    topic: str
    user_persona: str
    subject: str


# ─── Auth Models ───────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    dob: Optional[str] = None      # ISO date string YYYY-MM-DD
    grade: Optional[str] = None
    interests: Optional[str] = None


class SigninRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    user_id: str
    name: str


class TokenData(BaseModel):
    user_id: str
    name: str
