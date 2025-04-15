import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.sql import text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get the database URL from environment variables
database_url = os.environ.get('DATABASE_URL')

if not database_url:
    raise ValueError("DATABASE_URL environment variable is not set")

# Create the SQLAlchemy engine
try:
    engine = create_engine(database_url)
    logger.info("Database engine created successfully")
except Exception as e:
    logger.error(f"Error creating database engine: {str(e)}")
    raise

# Test the connection
def test_connection():
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1")).fetchone()
            if result[0] == 1:
                logger.info("Database connection test successful")
                return True
            else:
                logger.error("Database connection test failed")
                return False
    except Exception as e:
        logger.error(f"Error testing database connection: {str(e)}")
        return False

# If this file is run directly, test the connection
if __name__ == "__main__":
    test_connection()