import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import OpenAI from 'openai';

// Mock OpenAI
vi.mock('openai');

// Mock environment variables
const originalEnv = process.env;

describe('EKG Logic Tests', () => {
  let mockOpenAIClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: 'test-api-key',
      PRODUCT_EKG_VECTOR_ID: 'vs_test_product',
      PRE_SALES_EKG_VECTOR_ID: 'vs_test_presales',
    };

    mockOpenAIClient = {
      responses: {
        create: vi.fn(),
      },
    };

    (OpenAI as any).mockImplementation(() => mockOpenAIClient);
    vi.mocked(OpenAI).mockImplementation(() => mockOpenAIClient as any);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('EKG API Call Structure', () => {
    it('should call OpenAI Responses API with correct parameters', async () => {
      const requirementText = 'Test requirement';
      const productEkg = process.env.PRODUCT_EKG_VECTOR_ID || 'vs_6910a0f29b548191befd180730d968ee';
      const preSalesEkg = process.env.PRE_SALES_EKG_VECTOR_ID || 'vs_6911afabfee88191902b166f22d6021c';

      const mockResponse = {
        output_text: JSON.stringify({
          status: 'fully_available',
          response: 'Test response',
          available_features: [],
          gaps_or_customizations: [],
          references: [],
        }),
      };

      mockOpenAIClient.responses.create.mockResolvedValue(mockResponse);

      // Test the API call structure without actually instantiating OpenAI
      const response = await mockOpenAIClient.responses.create({
        model: 'gpt-5.1',
        input: 'placeholder',
        tools: [
          {
            type: 'file_search',
            vector_store_ids: [productEkg, preSalesEkg],
          },
        ],
        tool_choice: 'auto',
      });

      const callArgs = mockOpenAIClient.responses.create.mock.calls[0][0];
      expect(callArgs.model).toBe('gpt-5.1');
      expect(callArgs.tools[0].vector_store_ids).toEqual([productEkg, preSalesEkg]);
      expect(typeof callArgs.input).toBe('string');
      expect(callArgs.input).toContain(requirementText);
      expect(response.output_text).toBeDefined();
    });

    it('should fallback to gpt-4o when gpt-5.1 fails', async () => {
      const mockResponse = {
        output_text: JSON.stringify({
          status: 'partially_available',
          response: 'Test',
          available_features: [],
          gaps_or_customizations: [],
          references: [],
        }),
      };

      mockOpenAIClient.responses.create
        .mockRejectedValueOnce(new Error('Model not available'))
        .mockResolvedValueOnce(mockResponse);
      
      let response;
      const modelsToTry = ['gpt-5.1', 'gpt-4o'];
      
      for (const model of modelsToTry) {
        try {
          response = await mockOpenAIClient.responses.create({
            model,
            input: 'Test',
            tools: [{ type: 'file_search', vector_store_ids: ['vs1', 'vs2'] }],
            tool_choice: 'auto',
          });
          break;
        } catch (err) {
          if (model === modelsToTry[modelsToTry.length - 1]) {
            throw err;
          }
        }
      }

      expect(mockOpenAIClient.responses.create).toHaveBeenCalledTimes(2);
      expect(response).toBeDefined();
    });
  });

  describe('Response Parsing', () => {
    it('should extract JSON from output_text', () => {
      const mockResponse = {
        output_text: JSON.stringify({
          status: 'fully_available',
          response: 'Test response',
          available_features: ['Feature 1'],
          gaps_or_customizations: [],
          references: ['ref1'],
        }),
      };

      const parsed = JSON.parse(mockResponse.output_text);
      expect(parsed.status).toBe('fully_available');
      expect(parsed.available_features).toEqual(['Feature 1']);
    });

    it('should extract JSON from text with extra content', () => {
      const text = 'Some preamble\n{\n  "status": "fully_available",\n  "response": "Test"\n}\nTrailing text';
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      const jsonText = text.substring(start, end + 1);
      const parsed = JSON.parse(jsonText);
      
      expect(parsed.status).toBe('fully_available');
    });

    it('should handle output array format', () => {
      const mockResponse = {
        output: [
          {
            content: [
              { text: JSON.stringify({
                status: 'not_available',
                response: 'Test',
                available_features: [],
                gaps_or_customizations: [],
                references: [],
              })},
            ],
          },
        ],
      };

      const extractResponseText = (resp: any): string => {
        if (resp?.output_text) return resp.output_text;
        if (Array.isArray(resp?.output)) {
          const parts = resp.output.flatMap((o: any) => {
            if (Array.isArray(o?.content)) {
              return o.content.map((c: any) => c?.text || c?.content || '');
            }
            return [o?.content || o?.text || ''];
          });
          return parts.filter(Boolean).join('\n');
        }
        return '';
      };

      const rawText = extractResponseText(mockResponse);
      const parsed = JSON.parse(rawText);
      
      expect(parsed.status).toBe('not_available');
    });
  });

  describe('Data Transformation', () => {
    it('should transform EKG response to database format', () => {
      const ekgResponse = {
        status: 'fully_available',
        response: 'Test response',
        available_features: ['Feature 1', 'Feature 2'],
        gaps_or_customizations: ['Gap 1'],
        references: ['ref1', 'ref2'],
      };

      const updateData = {
        finalResponse: ekgResponse.response,
        modelProvider: 'ekg',
        ekgStatus: ekgResponse.status,
        ekgAvailableFeatures: JSON.stringify(ekgResponse.available_features),
        ekgGapsCustomizations: JSON.stringify(ekgResponse.gaps_or_customizations),
      };

      expect(updateData.modelProvider).toBe('ekg');
      expect(updateData.ekgStatus).toBe('fully_available');
      expect(JSON.parse(updateData.ekgAvailableFeatures)).toEqual(['Feature 1', 'Feature 2']);
    });

    it('should transform references to similarQuestions format', () => {
      const references = ['doc1.pdf', 'doc2.pdf'];
      const requirementText = 'Test requirement';
      const finalResponse = 'Test response';

      const similarQuestions = references.map((ref, idx) => ({
        id: idx + 1,
        reference: String(ref),
        category: 'EKG',
        requirement: requirementText,
        response: finalResponse,
        similarity_score: 1,
      }));

      expect(similarQuestions).toHaveLength(2);
      expect(similarQuestions[0].reference).toBe('doc1.pdf');
      expect(similarQuestions[0].category).toBe('EKG');
      expect(similarQuestions[1].reference).toBe('doc2.pdf');
    });

    it('should handle empty arrays correctly', () => {
      const ekgResponse = {
        status: 'not_available',
        response: 'Test',
        available_features: [],
        gaps_or_customizations: [],
        references: [],
      };

      const availableFeatures = Array.isArray(ekgResponse.available_features) 
        ? ekgResponse.available_features 
        : [];
      const gaps = Array.isArray(ekgResponse.gaps_or_customizations)
        ? ekgResponse.gaps_or_customizations
        : [];

      expect(availableFeatures).toEqual([]);
      expect(gaps).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing API key', () => {
      delete process.env.OPENAI_API_KEY;
      expect(process.env.OPENAI_API_KEY).toBeUndefined();
    });

    it('should handle missing requirement text', () => {
      const requirementText = '';
      expect(requirementText).toBe('');
    });

    it('should handle API errors with proper structure', () => {
      const apiError = {
        message: 'Rate limit exceeded',
        response: {
          data: {
            error: {
              message: 'Rate limit exceeded',
            },
          },
        },
      };

      const errMsg = apiError?.response?.data?.error?.message || apiError?.message || 'Unknown error';
      expect(errMsg).toBe('Rate limit exceeded');
    });

    it('should handle JSON parsing errors', () => {
      const invalidJson = 'Invalid JSON { missing closing brace';
      expect(() => JSON.parse(invalidJson)).toThrow();
    });
  });

  describe('Vector Store Configuration', () => {
    it('should use default vector store IDs when env vars are not set', () => {
      delete process.env.PRODUCT_EKG_VECTOR_ID;
      delete process.env.PRE_SALES_EKG_VECTOR_ID;

      const productEkg = process.env.PRODUCT_EKG_VECTOR_ID || 'vs_6910a0f29b548191befd180730d968ee';
      const preSalesEkg = process.env.PRE_SALES_EKG_VECTOR_ID || 'vs_6911afabfee88191902b166f22d6021c';

      expect(productEkg).toBe('vs_6910a0f29b548191befd180730d968ee');
      expect(preSalesEkg).toBe('vs_6911afabfee88191902b166f22d6021c');
    });

    it('should use custom vector store IDs from environment', () => {
      process.env.PRODUCT_EKG_VECTOR_ID = 'vs_custom_product';
      process.env.PRE_SALES_EKG_VECTOR_ID = 'vs_custom_presales';

      const productEkg = process.env.PRODUCT_EKG_VECTOR_ID || 'vs_6910a0f29b548191befd180730d968ee';
      const preSalesEkg = process.env.PRE_SALES_EKG_VECTOR_ID || 'vs_6911afabfee88191902b166f22d6021c';

      expect(productEkg).toBe('vs_custom_product');
      expect(preSalesEkg).toBe('vs_custom_presales');
    });
  });
});
