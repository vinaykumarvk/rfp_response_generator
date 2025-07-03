# Testing Protocol for RFP Response Generator

## Purpose
This document establishes mandatory testing procedures to prevent regression issues and maintain system reliability.

## Pre-Change Testing (MANDATORY)
Before making ANY changes to core functionality, run:
```bash
python3 test_suite.py
```
This establishes a baseline of working functionality.

## Post-Change Testing (MANDATORY)
After making changes, run the same test suite to ensure no regressions.

## Core Test Categories

### 1. Database Connectivity
- Verifies database connection works
- Confirms embeddings table has data
- **Critical**: Must pass before any similarity search work

### 2. Similarity Search Integrity
- Tests basic similarity search functionality
- Validates 90% threshold enforcement
- Ensures vector similarity (not text matching)
- **Critical**: Core feature that must never regress

### 3. Response Generation Quality
- Tests response generation without errors
- Validates no dummy customer names
- Ensures proper response structure for 4-tab UI
- **Critical**: User-facing functionality

### 4. Anti-Hallucination Controls
- Verifies similarity threshold enforcement
- Checks source attribution requirements
- Ensures no content below 90% similarity
- **Critical**: Data integrity requirement

## Test Execution Rules

### For Developers/AI Assistants:
1. **NEVER** modify core functions without running tests first
2. **ALWAYS** run tests after changes
3. **DOCUMENT** any test failures immediately
4. **REVERT** changes if tests fail and fix incrementally

### Test Failure Protocol:
1. **STOP** all development work
2. **IDENTIFY** the specific regression
3. **REVERT** to last known working state
4. **FIX** the issue incrementally
5. **RE-TEST** before proceeding

## Specific Test Requirements

### Similarity Search Tests:
- Must process all embeddings in database
- Must enforce exactly 90% threshold (not 89.9% or 88%)
- Must return structured results with customer attribution
- Must complete without timeout errors

### Response Generation Tests:
- Must generate responses for all three models (OpenAI, Anthropic, DeepSeek)
- Must create clean final_response without source references
- Must include source references in model-specific columns
- Must support 4-tab interface structure

### Data Integrity Tests:
- No dummy customer names ("ABC Corp", "XYZ Client", etc.)
- All similarity scores must be ≥90%
- Source attributions must include customer names when available
- Response content must be traceable to high-similarity sources

## Automated Regression Detection

The test suite automatically checks for:
- Database connectivity issues
- Similarity search functionality
- Threshold enforcement
- Response generation quality
- Interface compatibility
- Data integrity violations

## Critical Success Criteria

All tests must pass with:
- ✅ Database connectivity working
- ✅ Embeddings available for search
- ✅ Similarity search returns results or correctly identifies no matches
- ✅ 90% threshold strictly enforced
- ✅ Response generation works without errors
- ✅ No dummy customer names in outputs
- ✅ 4-tab interface data structure maintained

## When Tests Fail

**IMMEDIATE ACTIONS:**
1. Stop all development
2. Run `python3 test_suite.py` to identify specific failures
3. Review recent changes that could have caused regression
4. Restore working functionality before adding new features
5. Document the regression and prevention measures

This protocol ensures system reliability and prevents the regression issues that can break user trust.