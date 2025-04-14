import os
import json
import logging
from database import engine
from sqlalchemy import text

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def find_similar_matches(requirement_id):
    """
    Find similar matches for a given requirement ID.
    This is a simplified version that returns mock data for demonstration.
    
    Args:
        requirement_id: The ID of the requirement to find matches for
        
    Returns:
        Dictionary containing the requirement and similar matches
    """
    try:
        print(f"\n=== Finding Similar Matches for Requirement ID: {requirement_id} ===")
        
        # Simulate retrieving the requirement
        requirement_text = f"Requirement for ID {requirement_id}: Please describe your system's capabilities for wealth management, including portfolio management, reporting, and client engagement features."
        category = "Wealth Management"
        
        print("\nOriginal Requirement:")
        print(f"ID: {requirement_id}")
        print(f"Category: {category}")
        print(f"Text: {requirement_text}")
        print("\nTop 5 Similar Matches:")
        
        # Simulate similar matches with mock data
        similar_matches = [
            {
                "id": 45,
                "requirement": "Describe portfolio management functionality in your wealth management platform.",
                "response": "Our portfolio management system provides comprehensive asset allocation, performance tracking, and rebalancing capabilities. It supports diversified investment strategies across various asset classes including equities, fixed income, alternatives, and cash. The platform enables dynamic portfolio construction based on client goals, risk tolerance, and time horizons.",
                "category": "Portfolio Management",
                "similarity_score": 0.923
            },
            {
                "id": 18,
                "requirement": "What client engagement features does your system offer?",
                "response": "Our client engagement module includes secure messaging, document sharing, financial goal tracking, and an interactive dashboard. Clients can access their portfolio information, performance reports, and financial planning tools through a customizable interface. The system also supports scheduled and on-demand reporting with white-labeling options.",
                "category": "Client Engagement",
                "similarity_score": 0.887
            },
            {
                "id": 67,
                "requirement": "Explain your system's reporting capabilities.",
                "response": "Our reporting system generates comprehensive performance reports, tax statements, and compliance documentation. Reports can be customized with firm branding and tailored to client needs. The platform supports scheduled report delivery, batch processing, and on-demand generation with various export formats including PDF, Excel, and interactive web versions.",
                "category": "Reporting",
                "similarity_score": 0.854
            },
            {
                "id": 32,
                "requirement": "How does your wealth management platform handle financial planning?",
                "response": "The financial planning module supports goal-based planning, retirement analysis, education funding, and estate planning. It incorporates Monte Carlo simulations, what-if scenarios, and cash flow projections. Advisors can create comprehensive financial plans that integrate with portfolio management and client engagement features.",
                "category": "Financial Planning",
                "similarity_score": 0.821
            },
            {
                "id": 52,
                "requirement": "Describe the integration capabilities of your wealth management solution.",
                "response": "Our platform offers seamless integration with CRM systems, financial planning tools, market data providers, and custodial platforms. It supports real-time data synchronization, single sign-on, and API-based connections. The system maintains a central data repository for consistent client information across all integrated components.",
                "category": "Integration",
                "similarity_score": 0.795
            }
        ]
        
        # Print the results
        for idx, match in enumerate(similar_matches, 1):
            print(f"\nMatch #{idx}")
            print(f"ID: {match['id']}")
            print(f"Category: {match['category']}")
            print(f"Similarity Score: {match['similarity_score']:.4f}")
            print(f"Requirement: {match['requirement']}")
            print(f"Response: {match['response']}")
            print("-" * 80)
        
        # Return structured data
        return {
            "id": requirement_id,
            "requirement": requirement_text,
            "category": category,
            "similar_matches": similar_matches
        }
        
    except Exception as e:
        logger.error(f"Error finding similar matches: {str(e)}")
        return {
            "id": requirement_id,
            "error": f"Error finding similar matches: {str(e)}",
            "similar_matches": []
        }

if __name__ == "__main__":
    # Test with requirement ID 1
    results = find_similar_matches(1)
    print(json.dumps(results, indent=2))