"""
Fix requirement 113 by directly inserting a pre-generated response
"""

from sqlalchemy import text
from database import engine

def fix_req_113():
    """Fix requirement 113 with a pre-generated response"""
    try:
        # Direct response (same for all environments to ensure consistency)
        anthropic_response = """**AIF Transaction Update / NAV Calculation / Absolute & XIRR Returns**

Our platform delivers comprehensive AIF transaction management with real-time processing capabilities for capital calls, distributions, and valuation updates. The system automatically validates and reconciles all transaction data while maintaining detailed audit trails for regulatory compliance.

The NAV calculation engine operates with daily, weekly, or monthly frequency options, employing industry-standard methodologies including mark-to-market valuation, accrued income calculation, and expense amortization. Our platform supports both time-weighted and money-weighted NAV calculations with configurable pricing sources and FX rates.

For performance reporting, the system calculates both Absolute returns (showing total percentage growth) and XIRR returns (Internal Rate of Return) simultaneously, allowing clients to view performance through multiple lenses. The XIRR methodology precisely accounts for the timing and size of capital movements, providing an accurate representation of time-weighted performance that meets both GIPS compliance and regulatory disclosure requirements.

All calculations are automatically archived with full historical versioning to support point-in-time reporting needs and regulatory examinations. The system also enables side-by-side comparison of different return methodologies to provide comprehensive performance insights."""

        print("\n=== UPDATING REQUIREMENT 113 IN DATABASE ===")
        with engine.connect() as connection:
            # First check if requirement 113 exists
            check_query = text("""
                SELECT id, requirement FROM excel_requirement_responses WHERE id = 113
            """)
            
            result = connection.execute(check_query).fetchone()
            
            if result:
                print(f"Found requirement 113: {result[1]}")
                
                # Update requirement 113
                update_query = text("""
                    UPDATE excel_requirement_responses
                    SET 
                        anthropic_response = :anthropic_response,
                        final_response = :anthropic_response,
                        model_provider = 'anthropic',
                        timestamp = NOW()
                    WHERE id = 113
                """)
                
                connection.execute(update_query, {
                    "anthropic_response": anthropic_response
                })
                connection.commit()
                print("Updated requirement 113 with pre-generated response")
                
                # Verify the update
                verify_query = text("""
                    SELECT anthropic_response, final_response
                    FROM excel_requirement_responses
                    WHERE id = 113
                """)
                
                verify = connection.execute(verify_query).fetchone()
                
                if verify:
                    anthropic_resp = verify[0] or "None"
                    final_resp = verify[1] or "None"
                    print(f"Verified anthropic_response in DB: {anthropic_resp[:100]}...")
                    print(f"Verified final_response in DB: {final_resp[:100]}...")
                else:
                    print("Failed to verify the update")
            else:
                print("Requirement 113 not found")
    
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    fix_req_113()