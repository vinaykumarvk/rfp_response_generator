#!/usr/bin/env python3
"""
Script to verify that the event_mappings column exists in the excel_requirement_responses table.
"""
import os
import sys
from sqlalchemy import create_engine, text
from database import engine

def verify_column():
    """Verify that event_mappings column exists in excel_requirement_responses table."""
    try:
        with engine.connect() as connection:
            # Query to check if the column exists
            query = text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'excel_requirement_responses'
                AND column_name = 'event_mappings'
            """)
            
            result = connection.execute(query).fetchone()
            
            if result:
                column_name, data_type, is_nullable = result
                print("✅ SUCCESS: Column 'event_mappings' exists in 'excel_requirement_responses' table")
                print(f"   Column Name: {column_name}")
                print(f"   Data Type: {data_type}")
                print(f"   Nullable: {is_nullable}")
                return True
            else:
                print("❌ ERROR: Column 'event_mappings' NOT found in 'excel_requirement_responses' table")
                return False
                
    except Exception as e:
        print(f"❌ ERROR: Failed to verify column: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def list_all_columns():
    """List all columns in the excel_requirement_responses table for reference."""
    try:
        with engine.connect() as connection:
            query = text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'excel_requirement_responses'
                ORDER BY ordinal_position
            """)
            
            results = connection.execute(query).fetchall()
            
            print("\n📋 All columns in 'excel_requirement_responses' table:")
            print("-" * 60)
            for row in results:
                column_name, data_type, is_nullable = row
                nullable_str = "NULL" if is_nullable == "YES" else "NOT NULL"
                print(f"  • {column_name:30} {data_type:20} {nullable_str}")
            print("-" * 60)
            
    except Exception as e:
        print(f"❌ ERROR: Failed to list columns: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🔍 Verifying 'event_mappings' column in database...\n")
    
    success = verify_column()
    list_all_columns()
    
    sys.exit(0 if success else 1)

