const FrameworkAnalysisEngine = require('../frameworkAnalysisEngine');

// Mock axios for API calls
jest.mock('axios');
const axios = require('axios');

// Mock fs for file reading
jest.mock('fs');
const fs = require('fs');

describe('FrameworkAnalysisEngine - Question Generation', () => {
  let frameworkEngine;

  beforeEach(() => {
    // Mock environment variables
    process.env.CLAUDE_API_KEY = 'test_claude_key';
    process.env.OPENAI_API_KEY = 'test_openai_key';

    // Mock framework file content
    fs.readFileSync.mockReturnValue(`
# Reddit Sentiment Analysis Framework
Mock framework content for testing
    `);

    frameworkEngine = new FrameworkAnalysisEngine();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('generateDynamicQuestions', () => {
    const mockAnalysisData = {
      individual_scores: [
        {
          title: 'How to start learning programming?',
          sentiment_score: 0.7,
          score: 25,
          num_comments: 12,
          subreddit: 'learnprogramming'
        },
        {
          title: 'Best programming language for beginners',
          sentiment_score: 0.5,
          score: 18,
          num_comments: 8,
          subreddit: 'learnprogramming'
        }
      ]
    };

    const mockCommunityProfile = {
      community_type: {
        primary: 'hobby',
        secondary: ['support'],
        confidence: 0.85
      }
    };

    const mockPatterns = {
      unexpectedCorrelations: [
        {
          correlation: 'Beginner questions get more engagement than expert discussions',
          surprise_factor: 0.8
        }
      ]
    };

    it('should generate questions for hobby communities', async () => {
      const mockAIResponse = {
        generated_questions: [
          {
            question: 'How do beginners vs experts approach learning programming?',
            category: 'demographic',
            data_requirements: ['experience_indicators', 'learning_patterns'],
            expected_insights: ['learning_optimization', 'skill_development'],
            surprise_factor: 0.8,
            actionability: 0.9
          },
          {
            question: 'What traditional vs modern learning methods do programmers prefer?',
            category: 'cultural',
            data_requirements: ['method_mentions', 'preference_data'],
            expected_insights: ['education_trends', 'learning_evolution'],
            surprise_factor: 0.7,
            actionability: 0.8
          }
        ]
      };

      // Mock successful AI response
      axios.post.mockResolvedValue({
        data: {
          content: [{ text: JSON.stringify(mockAIResponse) }]
        }
      });

      const result = await frameworkEngine.generateDynamicQuestions(
        mockAnalysisData,
        mockCommunityProfile,
        mockPatterns
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('question');
      expect(result[0]).toHaveProperty('category');
      expect(result[0].question).toContain('beginners vs experts');
    });

    it('should generate questions for product communities', async () => {
      const productCommunityProfile = {
        community_type: {
          primary: 'product',
          confidence: 0.9
        }
      };

      const mockAIResponse = {
        generated_questions: [
          {
            question: 'How do budget vs premium buyers discuss product value?',
            category: 'demographic',
            data_requirements: ['price_mentions', 'value_discussions'],
            expected_insights: ['market_segmentation', 'pricing_strategy'],
            surprise_factor: 0.8
          }
        ]
      };

      axios.post.mockResolvedValue({
        data: {
          content: [{ text: JSON.stringify(mockAIResponse) }]
        }
      });

      const result = await frameworkEngine.generateDynamicQuestions(
        mockAnalysisData,
        productCommunityProfile,
        mockPatterns
      );

      expect(result).toHaveLength(1);
      expect(result[0].question).toContain('budget vs premium');
    });

    it('should handle AI service failures gracefully', async () => {
      axios.post.mockRejectedValue(new Error('AI service unavailable'));

      const result = await frameworkEngine.generateDynamicQuestions(
        mockAnalysisData,
        mockCommunityProfile,
        mockPatterns
      );

      // Should return fallback questions
      expect(result).toHaveLength(2);
      expect(result[0].id).toContain('fallback');
    });

    it('should handle malformed AI responses', async () => {
      // Mock malformed response
      axios.post.mockResolvedValue({
        data: {
          content: [{ text: 'Invalid JSON response' }]
        }
      });

      const result = await frameworkEngine.generateDynamicQuestions(
        mockAnalysisData,
        mockCommunityProfile,
        mockPatterns
      );

      // Should return fallback questions
      expect(result).toHaveLength(2);
      expect(result[0].id).toContain('fallback');
    });

    it('should use appropriate templates for different community types', async () => {
      const supportCommunityProfile = {
        community_type: {
          primary: 'support',
          confidence: 0.8
        }
      };

      // Mock the processWithAI method to capture the prompt
      const processWithAISpy = jest.spyOn(frameworkEngine, 'processWithAI');
      processWithAISpy.mockResolvedValue({
        generated_questions: [
          {
            question: 'Test question',
            category: 'behavioral'
          }
        ]
      });

      await frameworkEngine.generateDynamicQuestions(
        mockAnalysisData,
        supportCommunityProfile,
        mockPatterns
      );

      // Verify that processWithAI was called with the right parameters
      expect(processWithAISpy).toHaveBeenCalledWith(
        expect.stringContaining('support'),
        'question-generation',
        { useAdvanced: true }
      );

      processWithAISpy.mockRestore();
    });
  });

  describe('extractQuestionsFromResponse', () => {
    it('should extract questions from well-formed response', () => {
      const response = {
        generated_questions: [
          {
            question: 'How do users engage with content?',
            category: 'behavioral',
            data_requirements: ['engagement_data'],
            expected_insights: ['user_behavior'],
            surprise_factor: 0.7
          }
        ]
      };

      const result = frameworkEngine.extractQuestionsFromResponse(response, 'hobby');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('question');
      expect(result[0]).toHaveProperty('category');
      expect(result[0].question).toBe('How do users engage with content?');
    });

    it('should handle alternative response formats', () => {
      const response = {
        questions: [
          {
            text: 'Alternative question format',
            category: 'demographic'
          }
        ]
      };

      const result = frameworkEngine.extractQuestionsFromResponse(response, 'product');

      expect(result).toHaveLength(1);
      expect(result[0].question).toBe('Alternative question format');
    });

    it('should handle missing fields gracefully', () => {
      const response = {
        generated_questions: [
          {
            question: 'Minimal question'
            // Missing other fields
          }
        ]
      };

      const result = frameworkEngine.extractQuestionsFromResponse(response, 'general');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('category');
      expect(result[0]).toHaveProperty('data_requirements');
      expect(result[0]).toHaveProperty('expected_insights');
      expect(result[0].category).toBe('general'); // Should infer from question
    });

    it('should return empty array for invalid responses', () => {
      const invalidResponse = { invalid: 'response' };

      const result = frameworkEngine.extractQuestionsFromResponse(invalidResponse, 'hobby');

      expect(result).toEqual([]);
    });
  });

  describe('inferQuestionCategory', () => {
    it('should infer temporal category correctly', () => {
      const temporalQuestions = [
        'When do users post the most?',
        'What time of day gets best engagement?',
        'How does timing affect sentiment?'
      ];

      temporalQuestions.forEach(question => {
        const category = frameworkEngine.inferQuestionCategory(question);
        expect(category).toBe('temporal');
      });
    });

    it('should infer demographic category correctly', () => {
      const demographicQuestions = [
        'Who are the most active users?',
        'What demographic engages most?',
        'How do different user types behave?'
      ];

      demographicQuestions.forEach(question => {
        const category = frameworkEngine.inferQuestionCategory(question);
        expect(category).toBe('demographic');
      });
    });

    it('should infer behavioral category correctly', () => {
      const behavioralQuestions = [
        'How do users behave with content?',
        'What behavior drives success?',
        'How do members engage in discussions?'
      ];

      behavioralQuestions.forEach(question => {
        const category = frameworkEngine.inferQuestionCategory(question);
        expect(category).toBe('behavioral');
      });
    });

    it('should infer cultural category correctly', () => {
      const culturalQuestions = [
        'What are the community culture and values?',
        'How do cultural norms affect posts?',
        'What cultural patterns emerge in the community?'
      ];

      culturalQuestions.forEach(question => {
        const category = frameworkEngine.inferQuestionCategory(question);
        expect(category).toBe('cultural');
      });
    });

    it('should default to general for unclear questions', () => {
      const generalQuestions = [
        'What is the main topic?',
        'Random question without clear category'
      ];

      generalQuestions.forEach(question => {
        const category = frameworkEngine.inferQuestionCategory(question);
        expect(category).toBe('general');
      });
    });
  });

  describe('generateFallbackQuestionsByType', () => {
    const mockAnalysisData = {
      individual_scores: [
        { title: 'Test', sentiment_score: 0.5, score: 10 }
      ]
    };

    it('should generate dating community fallback questions', () => {
      const result = frameworkEngine.generateFallbackQuestionsByType('dating', mockAnalysisData);

      expect(result).toHaveLength(2);
      expect(result[0].question).toContain('dating profiles');
      expect(result[1].question).toContain('relationship advice');
    });

    it('should generate product community fallback questions', () => {
      const result = frameworkEngine.generateFallbackQuestionsByType('product', mockAnalysisData);

      expect(result).toHaveLength(2);
      expect(result[0].question).toContain('budget-conscious vs premium');
      expect(result[1].question).toContain('product features');
    });

    it('should generate hobby community fallback questions', () => {
      const result = frameworkEngine.generateFallbackQuestionsByType('hobby', mockAnalysisData);

      expect(result).toHaveLength(2);
      expect(result[0].question).toContain('beginners vs experts');
      expect(result[1].question).toContain('traditional vs modern');
    });

    it('should generate support community fallback questions', () => {
      const result = frameworkEngine.generateFallbackQuestionsByType('support', mockAnalysisData);

      expect(result).toHaveLength(2);
      expect(result[0].question).toContain('support requests');
      expect(result[1].question).toContain('help-seeking');
    });

    it('should generate generic fallback questions for unknown types', () => {
      const result = frameworkEngine.generateFallbackQuestionsByType('unknown', mockAnalysisData);

      expect(result).toHaveLength(2);
      expect(result[0].question).toContain('content types');
      expect(result[1].question).toContain('sentiment patterns');
    });

    it('should ensure all fallback questions have required fields', () => {
      const result = frameworkEngine.generateFallbackQuestionsByType('hobby', mockAnalysisData);

      result.forEach(question => {
        expect(question).toHaveProperty('id');
        expect(question).toHaveProperty('question');
        expect(question).toHaveProperty('category');
        expect(question).toHaveProperty('template');
        expect(question).toHaveProperty('data_requirements');
        expect(question).toHaveProperty('expected_insights');
        expect(question).toHaveProperty('surprise_factor');
        expect(question.data_requirements).toBeInstanceOf(Array);
        expect(question.expected_insights).toBeInstanceOf(Array);
      });
    });

    it('should generate unique IDs for fallback questions', () => {
      const result = frameworkEngine.generateFallbackQuestionsByType('hobby', mockAnalysisData);

      const ids = result.map(q => q.id);
      const uniqueIds = [...new Set(ids)];
      
      expect(ids).toHaveLength(uniqueIds.length); // All IDs should be unique
      expect(ids[0]).toContain('fallback_hobby_0');
      expect(ids[1]).toContain('fallback_hobby_1');
    });
  });

  describe('Integration with prompt templates', () => {
    it('should use correct template for identity-based questions', () => {
      const communityProfile = { community_type: { primary: 'dating' } };
      const patterns = {};
      const analysisData = { individual_scores: [] };

      const prompt = frameworkEngine.generateQuestionPrompts(analysisData, communityProfile, patterns);

      expect(prompt).toContain('dating');
      expect(prompt).toContain('comparison questions');
    });

    it('should use correct template for product-focused questions', () => {
      const communityProfile = { community_type: { primary: 'product' } };
      const patterns = {};
      const analysisData = { individual_scores: [] };

      const prompt = frameworkEngine.generateQuestionPrompts(analysisData, communityProfile, patterns);

      expect(prompt).toContain('product');
      expect(prompt).toContain('brand preferences');
    });

    it('should use correct template for skill-based questions', () => {
      const communityProfile = { community_type: { primary: 'hobby' } };
      const patterns = {};
      const analysisData = { individual_scores: [] };

      const prompt = frameworkEngine.generateQuestionPrompts(analysisData, communityProfile, patterns);

      expect(prompt).toContain('hobby');
      expect(prompt).toContain('learning approaches');
    });

    it('should handle missing community profile gracefully', () => {
      const patterns = {};
      const analysisData = { individual_scores: [] };

      const prompt = frameworkEngine.generateQuestionPrompts(analysisData, null, patterns);

      expect(prompt).toContain('general');
    });
  });
});