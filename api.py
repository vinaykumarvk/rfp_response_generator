from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from call_llms import get_llm_responses
from database import engine, SessionLocal
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import datetime
import logging
import traceback
import json

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(title="RFP Response API")

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ResponseRequest(BaseModel):
    requirement_id: int
    model: str = 'moa'

    class Config:
        schema_extra = {
            "example": {
                "requirement_id": 3,
                "model": "openai"
            }
        }

class SimilarQuestion(BaseModel):
    question: str
    response: str
    reference: str
    similarity_score: str

    class Config:
        schema_extra = {
            "example": {
                "question": "How does the system handle tax reporting?",
                "response": "The system supports multi-jurisdictional tax reporting...",
                "reference": "Response #1",
                "similarity_score": "0.85"
            }
        }

class ExcelRequirement(BaseModel):
    requirement: str
    category: str
    rfp_name: str
    uploaded_by: str

    class Config:
        schema_extra = {
            "example": {
                "requirement": "Describe the reporting capabilities",
                "category": "Reporting",
                "rfp_name": "Test RFP",
                "uploaded_by": "Test User"
            }
        }

class ResponseData(BaseModel):
    id: int
    requirement: str
    category: str
    final_response: Optional[str] = None
    openai_response: Optional[str] = None
    anthropic_response: Optional[str] = None
    deepseek_response: Optional[str] = None
    moa_response: Optional[str] = None
    similar_questions: List[SimilarQuestion] = []
    rfp_name: Optional[str] = None
    uploaded_by: Optional[str] = None
    timestamp: Optional[datetime] = None

    class Config:
        schema_extra = {
            "example": {
                "id": 3,
                "requirement": "Explain tax reporting capabilities",
                "category": "Tax",
                "final_response": "The system handles tax reporting...",
                "openai_response": "OpenAI's response...",
                "anthropic_response": "Anthropic's response...",
                "deepseek_response": "Deepseek's response...",
                "moa_response": "MOA's response...",
                "similar_questions": [
                    {
                        "question": "How does the system handle tax reporting?",
                        "response": "The system supports multi-jurisdictional tax reporting...",
                        "reference": "Response #1",
                        "similarity_score": "0.95"
                    }
                ],
                "rfp_name": "Sample RFP",
                "uploaded_by": "John Doe",
                "timestamp": "2024-03-13T12:00:00"
            }
        }

@app.post("/api/generate-response")
async def generate_response(request: ResponseRequest, db: Session = Depends(get_db)):
    try:
        logger.info(f"Generating response for requirement {request.requirement_id} using model {request.model}")

        # Get requirement details from database
        query = text("""
            SELECT r.id, r.requirement, r.category 
            FROM excel_requirement_responses r
            WHERE r.id = :requirement_id
        """)
        result = db.execute(query, {"requirement_id": request.requirement_id}).fetchone()

        if not result:
            logger.error(f"Requirement {request.requirement_id} not found")
            raise HTTPException(status_code=404, detail="Requirement not found")

        requirement = result[1]
        category = result[2]

        # Get similar questions from database (from the JSON field in excel_requirement_responses)
        similar_questions_query = text("""
            SELECT similar_questions 
            FROM excel_requirement_responses 
            WHERE id = :requirement_id
        """)
        similar_result = db.execute(similar_questions_query, {"requirement_id": request.requirement_id}).fetchone()
        similar_questions_list = []
        
        # Parse the JSON string if available
        if similar_result and similar_result[0]:
            try:
                import json
                similar_questions_list = json.loads(similar_result[0])
            except (json.JSONDecodeError, TypeError):
                logger.warning(f"Failed to parse similar_questions JSON for requirement {request.requirement_id}")
                similar_questions_list = []

        # Generate response
        try:
            response_data = await get_llm_responses(request.requirement_id, model=request.model)
            logger.info(f"Successfully generated response for requirement {request.requirement_id}")
            return response_data
        except ValueError as e:
            logger.error(f"API key error: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}\n{traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.get("/api/fetch-response/{requirement_id}")
async def fetch_response(requirement_id: int, db: Session = Depends(get_db)):
    try:
        # Get the response with all details
        query = text("""
            SELECT id, requirement, category, 
                   final_response,
                   openai_response,
                   anthropic_response,
                   deepseek_response,
                   moa_response,
                   similar_questions
            FROM excel_requirement_responses
            WHERE id = :requirement_id
        """)
        result = db.execute(query, {"requirement_id": requirement_id}).fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Response not found")

        # Parse similar questions from JSON field
        similar_questions = []
        if result[8]:  # similar_questions column
            try:
                import json
                similar_questions = json.loads(result[8])
            except (json.JSONDecodeError, TypeError):
                logger.warning(f"Failed to parse similar_questions JSON for requirement {requirement_id}")
                similar_questions = []

        return ResponseData(
            id=result[0],
            requirement=result[1],
            category=result[2],
            final_response=result[3],
            openai_response=result[4],
            anthropic_response=result[5],
            deepseek_response=result[6],
            moa_response=result[7],
            similar_questions=similar_questions
        )
    except Exception as e:
        logger.error(f"Error fetching response: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/excel-requirements")
async def create_excel_requirement(requirement: ExcelRequirement, db: Session = Depends(get_db)):
    try:
        # Insert the requirement into the database
        query = text("""
            INSERT INTO excel_requirement_responses (requirement, category, rfp_name, uploaded_by, timestamp)
            VALUES (:requirement, :category, :rfp_name, :uploaded_by, :timestamp)
            RETURNING id
        """)

        result = db.execute(
            query,
            {
                "requirement": requirement.requirement,
                "category": requirement.category,
                "rfp_name": requirement.rfp_name,
                "uploaded_by": requirement.uploaded_by,
                "timestamp": datetime.now()
            }
        )

        db.commit()
        requirement_id = result.scalar()

        return {"id": requirement_id, "message": "Requirement created successfully"}
    except Exception as e:
        logger.error(f"Error creating requirement: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8003) 