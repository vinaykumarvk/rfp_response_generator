#!/usr/bin/env python3
"""
Test Neon database connection and check for embeddings
"""
import os
import sys
from database import engine
from sqlalchemy import text

def test_neon_connection():
    """Test connection to Neon database and check embeddings"""
    database_url = os.environ.get('DATABASE_URL', '')
    
    if not database_url:
        print("❌ ERROR: DATABASE_URL not set in environment")
        print("   Set it with: export DATABASE_URL='your-neon-url'")
        return False
    
    print("=" * 60)
    print("Testing Neon Database Connection")
    print("=" * 60)
    print(f"\nDATABASE_URL: {database_url[:50]}...")
    
    # Check if it's a Neon URL
    is_neon = 'neon.tech' in database_url.lower()
    print(f"Is Neon URL: {'✅ Yes' if is_neon else '⚠️  No (does not contain neon.tech)'}")
    
    try:
        with engine.connect() as conn:
            # Test basic connection
            result = conn.execute(text("SELECT version(), current_database()"))
            version, db_name = result.fetchone()
            print(f"\n✅ Connected successfully!")
            print(f"   Database: {db_name}")
            print(f"   Version: {version.split(',')[0]}")
            
            # Check if embeddings table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'embeddings'
                )
            """))
            has_table = result.fetchone()[0]
            print(f"\n✅ Embeddings table exists: {has_table}")
            
            if has_table:
                # Count embeddings
                result = conn.execute(text("SELECT COUNT(*) FROM embeddings"))
                count = result.fetchone()[0]
                print(f"✅ Total embeddings: {count}")
                
                # Check for vector column
                result = conn.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = 'embeddings' 
                        AND column_name = 'embedding'
                    )
                """))
                has_vector_col = result.fetchone()[0]
                print(f"✅ Vector column exists: {has_vector_col}")
                
                # Check for pgvector extension
                result = conn.execute(text("SELECT * FROM pg_extension WHERE extname = 'vector'"))
                ext = result.fetchone()
                has_pgvector = ext is not None
                print(f"✅ pgvector extension installed: {has_pgvector}")
                
                if count > 0 and has_vector_col:
                    # Show sample embeddings
                    result = conn.execute(text("""
                        SELECT id, category, requirement 
                        FROM embeddings 
                        LIMIT 3
                    """))
                    print(f"\n📊 Sample embeddings:")
                    for row in result:
                        print(f"   - ID {row[0]}: {row[1]} - {row[2][:50]}...")
                
                # Check excel_requirement_responses
                result = conn.execute(text("SELECT COUNT(*) FROM excel_requirement_responses"))
                req_count = result.fetchone()[0]
                print(f"\n✅ Requirements in database: {req_count}")
            
            print("\n" + "=" * 60)
            print("✅ Connection test successful!")
            print("=" * 60)
            return True
            
    except Exception as e:
        print(f"\n❌ Connection failed: {str(e)}")
        print("\nTroubleshooting:")
        print("1. Check your DATABASE_URL is correct")
        print("2. Verify your Neon database is running")
        print("3. Check network connectivity")
        return False

if __name__ == "__main__":
    success = test_neon_connection()
    sys.exit(0 if success else 1)

