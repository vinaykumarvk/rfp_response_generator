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
            FROM excel_requirements r
            WHERE r.id = :requirement_id
        """)
        result = db.execute(query, {"requirement_id": request.requirement_id}).fetchone()

        if not result:
            logger.error(f"Requirement {request.requirement_id} not found")
            raise HTTPException(status_code=404, detail="Requirement not found")

        requirement = result[1]
        category = result[2]

        # Get similar questions from database
        similar_questions_query = text("""
            SELECT similar_question 
            FROM similar_questions 
            WHERE requirement_id = :requirement_id
        """)
        similar_questions = db.execute(similar_questions_query, {"requirement_id": request.requirement_id}).fetchall()
        similar_questions_list = [q[0] for q in similar_questions]

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
        # Get the latest response for the requirement
        query = text("""
            SELECT r.id, e.requirement, e.category, 
                   r.response as final_response,
                   r.response as openai_response,
                   r.response as anthropic_response,
                   r.response as deepseek_response,
                   r.response as moa_response
            FROM excel_requirement_responses r
            JOIN excel_requirements e ON r.requirement_id = e.id
            WHERE r.requirement_id = :requirement_id
            ORDER BY r.created_at DESC
            LIMIT 1
        """)
        result = db.execute(query, {"requirement_id": requirement_id}).fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Response not found")

        # Get similar questions from the similar_questions table
        similar_query = text("""
            SELECT similar_question, similarity_score
            FROM similar_questions
            WHERE requirement_id = :requirement_id
            ORDER BY similarity_score DESC
        """)
        similar_results = db.execute(similar_query, {"requirement_id": requirement_id}).fetchall()

        # Format similar questions
        similar_questions = []
        for row in similar_results:
            similar_questions.append({
                "question": row[0],
                "similarity_score": row[1]
            })

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
            INSERT INTO excel_requirements (requirement, category, rfp_name, uploaded_by, created_at)
            VALUES (:requirement, :category, :rfp_name, :uploaded_by, :created_at)
            RETURNING id
        """)

        result = db.execute(
            query,
            {
                "requirement": requirement.requirement,
                "category": requirement.category,
                "rfp_name": requirement.rfp_name,
                "uploaded_by": requirement.uploaded_by,
                "created_at": datetime.now()
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