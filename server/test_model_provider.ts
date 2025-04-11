/**
 * Test script to check model provider handling
 */
import { pool } from './db';

// Test the model provider field
async function testModelProvider() {
  try {
    console.log("Testing model provider field handling...");
    
    // Select a few records from the table
    const { rows: initialRows } = await pool.query<{
      id: number;
      requirement: string;
      model_provider: string | null;
      final_response: string | null;
    }>(
      `SELECT id, requirement, model_provider, final_response 
       FROM excel_requirement_responses 
       ORDER BY id 
       LIMIT 5`
    );
    
    console.log("Current rows:");
    initialRows.forEach(row => {
      console.log(`ID: ${row.id}, Model Provider: ${row.model_provider || 'NULL'}, Has Response: ${row.final_response ? 'Yes' : 'No'}`);
    });
    
    // Update one row with "moa" as model provider
    if (initialRows.length > 0) {
      const idToUpdate = initialRows[0].id;
      
      await pool.query(
        `UPDATE excel_requirement_responses 
         SET model_provider = $1, 
             final_response = $2,
             moa_response = $3
         WHERE id = $4`,
        ['moa', 'Test MOA response', 'Test MOA response', idToUpdate]
      );
      
      console.log(`\nUpdated row ${idToUpdate} with model_provider = 'moa'`);
      
      // Check the updated record
      const { rows: updatedRows } = await pool.query<{
        id: number;
        requirement: string;
        model_provider: string | null;
        final_response: string | null;
        moa_response: string | null;
      }>(
        `SELECT id, requirement, model_provider, final_response, moa_response
         FROM excel_requirement_responses 
         WHERE id = $1`,
        [idToUpdate]
      );
      
      console.log("\nAfter update:");
      updatedRows.forEach(row => {
        console.log(`ID: ${row.id}, Model Provider: ${row.model_provider || 'NULL'}, Has Response: ${row.final_response ? 'Yes' : 'No'}, Has MOA: ${row.moa_response ? 'Yes' : 'No'}`);
      });
      
      // Update another row with "openai" as model provider
      if (initialRows.length > 1) {
        const secondIdToUpdate = initialRows[1].id;
        
        await pool.query(
          `UPDATE excel_requirement_responses 
           SET model_provider = $1, 
               final_response = $2,
               openai_response = $3
           WHERE id = $4`,
          ['openai', 'Test OpenAI response', 'Test OpenAI response', secondIdToUpdate]
        );
        
        console.log(`\nUpdated row ${secondIdToUpdate} with model_provider = 'openai'`);
        
        // Check the second updated record
        const { rows: secondUpdatedRows } = await pool.query<{
          id: number;
          requirement: string;
          model_provider: string | null;
          final_response: string | null;
          openai_response: string | null;
        }>(
          `SELECT id, requirement, model_provider, final_response, openai_response
           FROM excel_requirement_responses 
           WHERE id = $1`,
          [secondIdToUpdate]
        );
        
        console.log("\nAfter second update:");
        secondUpdatedRows.forEach(row => {
          console.log(`ID: ${row.id}, Model Provider: ${row.model_provider || 'NULL'}, Has Response: ${row.final_response ? 'Yes' : 'No'}, Has OpenAI: ${row.openai_response ? 'Yes' : 'No'}`);
        });
      }
    }
    
    // Check the schema for the model_provider column
    const { rows: columnInfo } = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name = 'excel_requirement_responses' AND column_name = 'model_provider'`
    );
    
    console.log("\nColumn information for model_provider:");
    console.log(columnInfo);
    
    console.log("\nTest completed successfully");
  } catch (error) {
    console.error("Error in test:", error);
  } finally {
    await pool.end();
  }
}

// Run the test
testModelProvider();