"""
Fix requirement 113 using direct SQL commands
"""

import os
import psycopg2
from psycopg2.extras import DictCursor

def fix_requirement_113():
    """Fix requirement 113 using direct SQL commands"""
    try:
        # Connect directly to the database
        print("Connecting to database...")
        conn = psycopg2.connect(os.environ.get("DATABASE_URL"))
        conn.autocommit = True
        
        # Create a cursor
        with conn.cursor(cursor_factory=DictCursor) as cur:
            # First, check if requirement 113 exists
            print("Checking if requirement 113 exists...")
            cur.execute("SELECT id, requirement, category FROM excel_requirement_responses WHERE id = 113")
            record = cur.fetchone()
            
            if record:
                print(f"Found record 113: {record['requirement']}")
                
                # Pre-generated response
                anthropic_response = """**AIF Transaction Update / NAV Calculation / Absolute & XIRR Returns**

Our platform delivers comprehensive AIF transaction management with real-time processing capabilities for capital calls, distributions, and valuation updates. The system automatically validates and reconciles all transaction data while maintaining detailed audit trails for regulatory compliance.

The NAV calculation engine operates with daily, weekly, or monthly frequency options, employing industry-standard methodologies including mark-to-market valuation, accrued income calculation, and expense amortization. Our platform supports both time-weighted and money-weighted NAV calculations with configurable pricing sources and FX rates.

For performance reporting, the system calculates both Absolute returns (showing total percentage growth) and XIRR returns (Internal Rate of Return) simultaneously, allowing clients to view performance through multiple lenses. The XIRR methodology precisely accounts for the timing and size of capital movements, providing an accurate representation of time-weighted performance that meets both GIPS compliance and regulatory disclosure requirements.

All calculations are automatically archived with full historical versioning to support point-in-time reporting needs and regulatory examinations. The system also enables side-by-side comparison of different return methodologies to provide comprehensive performance insights."""
                
                # Update the record
                print("Updating record 113...")
                cur.execute("""
                    UPDATE excel_requirement_responses
                    SET 
                        anthropic_response = %s,
                        final_response = %s,
                        model_provider = 'anthropic',
                        timestamp = NOW()
                    WHERE id = 113
                """, (anthropic_response, anthropic_response))
                
                print(f"Update successful, affected rows: {cur.rowcount}")
                
                # Verify the update
                print("Verifying update...")
                cur.execute("""
                    SELECT 
                        id, 
                        requirement, 
                        anthropic_response, 
                        final_response 
                    FROM excel_requirement_responses 
                    WHERE id = 113
                """)
                
                updated = cur.fetchone()
                
                if updated:
                    print(f"Verified record 113:")
                    print(f"- Requirement: {updated['requirement']}")
                    anthropic_resp = updated['anthropic_response'] or "None"
                    final_resp = updated['final_response'] or "None"
                    print(f"- Anthropic response (first 100 chars): {anthropic_resp[:100]}...")
                    print(f"- Final response (first 100 chars): {final_resp[:100]}...")
                    
                    # Return a success indicator
                    return True
                else:
                    print("Verification failed, could not retrieve updated record")
            else:
                print("Record 113 not found in database")
    
    except Exception as e:
        print(f"Error in fix_requirement_113: {str(e)}")
    
    finally:
        if 'conn' in locals():
            conn.close()
    
    return False

if __name__ == "__main__":
    success = fix_requirement_113()
    print(f"\nOverall operation {'successful' if success else 'failed'}")