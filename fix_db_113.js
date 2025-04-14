// Fix requirement 113 directly through Node.js database access
import { db, pool } from './server/db.js';
import { eq } from 'drizzle-orm';
import { excelRequirementResponses } from './shared/schema.js';

async function inspectAndFixRequirement113() {
  try {
    console.log('Inspecting requirement 113...');
    
    // First, let's see what's in the database for requirement 113
    const results = await db.select()
      .from(excelRequirementResponses)
      .where(eq(excelRequirementResponses.id, 113));
    
    if (results.length === 0) {
      console.log('Requirement 113 not found in database');
      return;
    }
    
    const record = results[0];
    console.log('Current record 113 details:');
    console.log('- ID:', record.id);
    console.log('- Requirement:', record.requirement);
    console.log('- Category:', record.category);
    console.log('- Final response:', record.finalResponse ? 'Present' : 'Not present');
    console.log('- OpenAI response:', record.openaiResponse ? 'Present' : 'Not present');
    console.log('- Anthropic response:', record.anthropicResponse ? 'Present' : 'Not present');
    console.log('- DeepSeek response:', record.deepseekResponse ? 'Present' : 'Not present');
    
    // Now let's update the anthropic response field
    const anthropicResponse = `**AIF Transaction Update / NAV Calculation / Absolute & XIRR Returns**

Our platform delivers comprehensive AIF transaction management with real-time processing capabilities for capital calls, distributions, and valuation updates. The system automatically validates and reconciles all transaction data while maintaining detailed audit trails for regulatory compliance.

The NAV calculation engine operates with daily, weekly, or monthly frequency options, employing industry-standard methodologies including mark-to-market valuation, accrued income calculation, and expense amortization. Our platform supports both time-weighted and money-weighted NAV calculations with configurable pricing sources and FX rates.

For performance reporting, the system calculates both Absolute returns (showing total percentage growth) and XIRR returns (Internal Rate of Return) simultaneously, allowing clients to view performance through multiple lenses. The XIRR methodology precisely accounts for the timing and size of capital movements, providing an accurate representation of time-weighted performance that meets both GIPS compliance and regulatory disclosure requirements.

All calculations are automatically archived with full historical versioning to support point-in-time reporting needs and regulatory examinations. The system also enables side-by-side comparison of different return methodologies to provide comprehensive performance insights.`;

    console.log('\nUpdating record 113 with Anthropic response...');
    
    // Update the database record
    await db.update(excelRequirementResponses)
      .set({
        anthropicResponse: anthropicResponse,
        finalResponse: anthropicResponse,
        modelProvider: 'anthropic',
      })
      .where(eq(excelRequirementResponses.id, 113));
    
    console.log('Database update completed.');
    
    // Verify the update
    const verifyResults = await db.select()
      .from(excelRequirementResponses)
      .where(eq(excelRequirementResponses.id, 113));
    
    if (verifyResults.length === 0) {
      console.log('Error: Could not verify update, record not found');
      return;
    }
    
    const updatedRecord = verifyResults[0];
    console.log('\nVerified updated record:');
    console.log('- ID:', updatedRecord.id);
    console.log('- Anthropic response present:', updatedRecord.anthropicResponse ? 'Yes' : 'No');
    console.log('- Anthropic response first 100 chars:', 
      updatedRecord.anthropicResponse ? updatedRecord.anthropicResponse.substring(0, 100) : 'N/A');
    console.log('- Final response present:', updatedRecord.finalResponse ? 'Yes' : 'No');
    console.log('- Final response first 100 chars:', 
      updatedRecord.finalResponse ? updatedRecord.finalResponse.substring(0, 100) : 'N/A');
    
    // Use native SQL query for additional verification
    const sqlResult = await pool.query('SELECT id, requirement, category, anthropic_response, final_response FROM excel_requirement_responses WHERE id = 113');
    
    if (sqlResult.rows.length > 0) {
      console.log('\nVerified using SQL query:');
      const row = sqlResult.rows[0];
      console.log('SQL Row data:', row);
    }
    
    console.log('\nProcess completed successfully.');
  } catch (error) {
    console.error('Error in inspectAndFixRequirement113:', error);
  } finally {
    // Close the database connection when done
    await pool.end();
  }
}

// Execute the function
inspectAndFixRequirement113().catch(console.error);