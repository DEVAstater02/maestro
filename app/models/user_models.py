from pydantic import BaseModel, ConfigDict
from typing import Dict

class UserQuestionRequest(BaseModel):
    prompt : str

class UserQuestionResponse(BaseModel):
    llm_response = ConfigDict(extra="allow")
