// Test script for field mapping - using ESM
import { mapPythonResponseToDbFields } from './field_mapping_fix.js';

// Sample OpenAI response
const openaiResponse = {
  provider: "openai",
  generated_response: "This is a generated response from OpenAI",
  openai_response: "This is the OpenAI response field content",
  similar_responses: []
};

// Sample Anthropic response
const anthropicResponse = {
  provider: "anthropic",
  generated_response: "This is a generated response from Anthropic",
  anthropic_response: "This is the Anthropic response field content",
  similar_responses: []
};

// Sample MOA response
const moaResponse = {
  provider: "moa",
  generated_response: "This is a combined MOA response",
  openai_response: "This is the OpenAI part of MOA",
  anthropic_response: "This is the Anthropic part of MOA",
  similar_responses: []
};

// Test OpenAI mapping
console.log("\n=== TESTING OPENAI MAPPING ===");
const mappedOpenAI = mapPythonResponseToDbFields(openaiResponse, "openai");
console.log("Mapped OpenAI fields:", mappedOpenAI);

// Test Anthropic mapping
console.log("\n=== TESTING ANTHROPIC MAPPING ===");
const mappedAnthropic = mapPythonResponseToDbFields(anthropicResponse, "anthropic");
console.log("Mapped Anthropic fields:", mappedAnthropic);

// Test MOA mapping
console.log("\n=== TESTING MOA MAPPING ===");
const mappedMOA = mapPythonResponseToDbFields(moaResponse, "moa");
console.log("Mapped MOA fields:", mappedMOA);

console.log("\n=== ALL TESTS COMPLETE ===");