const EnhancedAnalysisService = require('../enhancedAnalysisService');
const FrameworkAnalysisEngine = require('../frameworkAnalysisEngine');

// Mock the FrameworkAnalysisEngine
jest.mock('../frameworkAnalysisEngine');

describe('Dynamic Question Generation', () => {
  let enhancedAnalysisService;
  let mockFrameworkEngine;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock framework engine
    mockFrameworkEngine = {
      generateDynamicQuestions: jest.fn(),
      processWithAI: jest.fn(),
      extractQuestionsFromResponse: jest.fn(),
      generateFallbackQuestionsByType: jest.fn()
    };
    
    // Mock the constructor
    FrameworkAnalysisEngine.mockImplementation(() => mockFrameworkEngine);
    
    enhancedAnalysisService = new EnhancedAnalysisService();
  });

  describe('generateDynamicQuestions', () => {
    const mockAnalysisData = {
      individual_scores: [
        {
          title: 'Test Post 1',
          sentiment_score: 0.8,
          score: 15,
          num_comments: 5,
          subreddit: 'test',
          created_utc: 1640995200
        },
        {
          title: 'Test Post 2',
          sentiment_score: -0.3,
          score: 8,
          num_comments: 12,
          subreddit: 'test',
          created_utc: 1641081600
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
          correlation: 'Negative posts get higher engagement',
          surprise_factor: 0.9
        }
      ]
    };

    it('should generate questions successfully', async () => {
      const mockGeneratedQuestions = [
        {
          id: 'generated_1',
          question: 'How do beginners vs experts approach learning?',
          category: 'demographic',
          template: 'learning_approaches',
          data_requirements: ['experience_indicators'],
          expected_insights: ['learning_paths'],
          surprise_factor: 0.8
        }
      ];

      mockFrameworkEngine.generateDynamicQuestions.mockResolvedValue(mockGeneratedQuestions);

      const result = await enhancedAnalysisService.generateDynamicQuestions(
        'test_analysis_id',
        mockAnalysisData,
        mockCommunityProfile,
        mockPatterns
      );

      expect(mockFrameworkEngine.generateDynamicQuestions).toHaveBeenCalledWith(
        mockAnalysisData,
        mockCommunityProfile,
        mockPatterns
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('question');
      expect(result[0]).toHaveProperty('answer');
      expect(result[0]).toHaveProperty('scoring');
    });

    it('should handle framework engine failures gracefully', async () => {
      mockFrameworkEngine.generateDynamicQuestions.mockRejectedValue(new Error('AI service unavailable'));

      const result = await enhancedAnalysisService.generateDynamicQuestions(
        'test_analysis_id',
        mockAnalysisData,
        mockCommunityProfile,
        mockPatterns
      );

      // Should return fallback questions
      expect(result).toHaveLength(2);
      expect(result[0].id).toContain('fallback');
    });

    it('should generate questions for different community types', async () => {
      const productCommunityProfile = {
        community_type: {
          primary: 'product',
          confidence: 0.9
        }
      };

      const mockProductQuestions = [
        {
          question: 'How do budget vs premium buyers discuss value?',
          category: 'demographic',
          surprise_factor: 0.8
        }
      ];

      mockFrameworkEngine.generateDynamicQuestions.mockResolvedValue(mockProductQuestions);

      const result = await enhancedAnalysisService.generateDynamicQuestions(
        'test_analysis_id',
        mockAnalysisData,
        productCommunityProfile,
        mockPatterns
      );

      expect(mockFrameworkEngine.generateDynamicQuestions).toHaveBeenCalledWith(
        mockAnalysisData,
        productCommunityProfile,
        mockPatterns
      );

      expect(result).toHaveLength(1);
    });
  });

  describe('scoreQuestions', () => {
    const mockQuestions = [
      {
        question: 'How do beginners vs experts approach learning?',
        category: 'demographic',
        data_requirements: ['experience_indicators'],
        expected_insights: ['learning_optimization', 'strategy_development'],
        surprise_factor: 0.8
      },
      {
        question: 'What content gets the most engagement?',
        category: 'behavioral',
        data_requirements: ['engagement_data'],
        expected_insights: ['content_insights'],
        surprise_factor: 0.5
      }
    ];

    const mockAnalysisData = {
      individual_scores: new Array(50).fill(0).map((_, i) => ({
        title: `Post ${i}`,
        sentiment_score: Math.random() - 0.5,
        score: Math.floor(Math.random() * 20)
      }))
    };

    it('should score questions correctly', async () => {
      const result = await enhancedAnalysisService.scoreQuestions(
        'test_analysis_id',
        mockQuestions,
        mockAnalysisData
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('scoring');
      expect(result[0].scoring).toHaveProperty('surpriseFactor');
      expect(result[0].scoring).toHaveProperty('dataAvailability');
      expect(result[0].scoring).toHaveProperty('actionability');
      expect(result[0].scoring).toHaveProperty('compositeScore');

      // Should be sorted by composite score (highest first)
      expect(result[0].scoring.compositeScore).toBeGreaterThanOrEqual(result[1].scoring.compositeScore);
    });

    it('should calculate surprise factor correctly', () => {
      const question1 = { question: 'What unexpected patterns emerge?', surprise_factor: 0.9 };
      const question2 = { question: 'What is the average score?', surprise_factor: 0.3 };

      const score1 = enhancedAnalysisService.calculateSurpriseFactor(question1, mockAnalysisData);
      const score2 = enhancedAnalysisService.calculateSurpriseFactor(question2, mockAnalysisData);

      expect(score1).toBeGreaterThan(score2);
      expect(score1).toBeLessThanOrEqual(1.0);
      expect(score2).toBeGreaterThanOrEqual(0.0);
    });

    it('should calculate data availability correctly', () => {
      const questionWithData = { data_requirements: ['post_scores', 'sentiment_data'] };
      const questionWithoutData = { data_requirements: [] };

      const score1 = enhancedAnalysisService.calculateDataAvailability(questionWithData, mockAnalysisData);
      const score2 = enhancedAnalysisService.calculateDataAvailability(questionWithoutData, mockAnalysisData);

      expect(score1).toBeGreaterThanOrEqual(score2);
      expect(score1).toBeLessThanOrEqual(1.0);
    });

    it('should calculate actionability correctly', () => {
      const actionableQuestion = { 
        question: 'How to optimize vs improve strategy?',
        expected_insights: ['optimization_strategy', 'improvement_method', 'timing_approach'] 
      };
      const nonActionableQuestion = { 
        question: 'What is the general info?',
        expected_insights: ['general_info', 'basic_stats'] 
      };

      const score1 = enhancedAnalysisService.calculateActionability(actionableQuestion);
      const score2 = enhancedAnalysisService.calculateActionability(nonActionableQuestion);

      expect(score1).toBeGreaterThan(score2);
    });

    it('should handle empty questions array', async () => {
      const result = await enhancedAnalysisService.scoreQuestions(
        'test_analysis_id',
        [],
        mockAnalysisData
      );

      expect(result).toEqual([]);
    });

    it('should limit results to top 8 questions', async () => {
      const manyQuestions = new Array(15).fill(0).map((_, i) => ({
        question: `Question ${i}`,
        category: 'general',
        surprise_factor: Math.random()
      }));

      const result = await enhancedAnalysisService.scoreQuestions(
        'test_analysis_id',
        manyQuestions,
        mockAnalysisData
      );

      expect(result).toHaveLength(8);
    });
  });

  describe('generateQuestionAnswers', () => {
    const mockScoredQuestions = [
      {
        id: 'q1',
        question: 'How do beginners vs experts approach learning?',
        category: 'demographic',
        data_requirements: ['experience_indicators'],
        scoring: { compositeScore: 0.8 }
      },
      {
        id: 'q2',
        question: 'What drives the most engagement?',
        category: 'behavioral',
        data_requirements: ['engagement_data'],
        scoring: { compositeScore: 0.7 }
      }
    ];

    const mockAnalysisData = {
      individual_scores: [
        {
          title: 'Beginner Question',
          sentiment_score: 0.5,
          score: 10,
          num_comments: 8
        },
        {
          title: 'Expert Analysis',
          sentiment_score: 0.3,
          score: 25,
          num_comments: 15
        }
      ]
    };

    const mockPatterns = {
      unexpectedCorrelations: []
    };

    it('should generate answers for all questions', async () => {
      const result = await enhancedAnalysisService.generateQuestionAnswers(
        'test_analysis_id',
        mockScoredQuestions,
        mockAnalysisData,
        mockPatterns
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('answer');
      expect(result[0].answer).toHaveProperty('summary');
      expect(result[0].answer).toHaveProperty('evidence');
      expect(result[0].answer).toHaveProperty('confidence');
      expect(result[0].answer).toHaveProperty('insights');
    });

    it('should generate demographic answers correctly', async () => {
      const demographicQuestion = {
        id: 'demo_q',
        question: 'How do different user types participate?',
        category: 'demographic',
        data_requirements: ['user_patterns']
      };

      const answer = enhancedAnalysisService.generateDemographicAnswer(
        demographicQuestion,
        { scores: mockAnalysisData.individual_scores }
      );

      expect(answer).toHaveProperty('summary');
      expect(answer.summary).toContain('Demographic');
      expect(answer.insights).toBeInstanceOf(Array);
      expect(answer.confidence).toBeGreaterThan(0);
    });

    it('should generate behavioral answers correctly', async () => {
      const behavioralQuestion = {
        id: 'behav_q',
        question: 'What drives engagement?',
        category: 'behavioral',
        data_requirements: ['engagement_data']
      };

      const answer = enhancedAnalysisService.generateBehavioralAnswer(
        behavioralQuestion,
        { scores: mockAnalysisData.individual_scores, patterns: mockPatterns }
      );

      expect(answer).toHaveProperty('summary');
      expect(answer.summary).toContain('Behavioral');
      expect(answer.insights).toBeInstanceOf(Array);
      expect(answer.insights.length).toBeGreaterThan(0);
    });

    it('should generate temporal answers correctly', async () => {
      const temporalData = mockAnalysisData.individual_scores.map(item => ({
        ...item,
        created_utc: Date.now() / 1000 - Math.random() * 86400 // Random time within last day
      }));

      const temporalQuestion = {
        id: 'temp_q',
        question: 'When is the community most active?',
        category: 'temporal',
        data_requirements: ['timing_data']
      };

      const answer = enhancedAnalysisService.generateTemporalAnswer(
        temporalQuestion,
        { scores: temporalData }
      );

      expect(answer).toHaveProperty('summary');
      expect(answer.summary).toContain('Temporal');
      expect(answer.insights).toBeInstanceOf(Array);
    });

    it('should generate cultural answers correctly', async () => {
      const culturalQuestion = {
        id: 'cult_q',
        question: 'What are the community values?',
        category: 'cultural',
        data_requirements: ['cultural_indicators']
      };

      const answer = enhancedAnalysisService.generateCulturalAnswer(
        culturalQuestion,
        { scores: mockAnalysisData.individual_scores, patterns: mockPatterns }
      );

      expect(answer).toHaveProperty('summary');
      expect(answer.summary).toContain('Cultural');
      expect(answer.insights).toBeInstanceOf(Array);
    });

    it('should handle answer generation failures gracefully', async () => {
      const questionWithError = {
        id: 'error_q',
        question: 'This will cause an error',
        category: 'unknown_category'
      };

      const result = await enhancedAnalysisService.generateQuestionAnswers(
        'test_analysis_id',
        [questionWithError],
        mockAnalysisData,
        mockPatterns
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('answer');
      expect(result[0].answer.confidence).toBeLessThanOrEqual(0.5);
    });
  });

  describe('generateFallbackQuestions', () => {
    const mockAnalysisData = {
      individual_scores: [
        { title: 'Test', sentiment_score: 0.5, score: 10 }
      ]
    };

    const mockCommunityProfile = {
      community_type: {
        primary: 'hobby',
        confidence: 0.8
      }
    };

    it('should generate fallback questions', () => {
      const result = enhancedAnalysisService.generateFallbackQuestions(
        'test_analysis_id',
        mockAnalysisData,
        mockCommunityProfile
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('question');
      expect(result[0]).toHaveProperty('category');
      expect(result[0]).toHaveProperty('answer');
      expect(result[0]).toHaveProperty('scoring');
    });

    it('should include analysis ID in fallback question IDs', () => {
      const analysisId = 'test_analysis_123';
      const result = enhancedAnalysisService.generateFallbackQuestions(
        analysisId,
        mockAnalysisData,
        mockCommunityProfile
      );

      expect(result[0].id).toContain('fallback');
      expect(result[0].id).toContain(analysisId);
    });
  });

  describe('extractRelevantDataForQuestion', () => {
    const mockAnalysisData = {
      individual_scores: [
        {
          title: 'Test Post',
          sentiment_score: 0.8,
          score: 15,
          num_comments: 5,
          created_utc: 1640995200
        }
      ]
    };

    const mockPatterns = { unexpectedCorrelations: [] };

    it('should extract basic relevant data', () => {
      const question = {
        data_requirements: ['post_scores', 'sentiment_data']
      };

      const result = enhancedAnalysisService.extractRelevantDataForQuestion(
        question,
        mockAnalysisData,
        mockPatterns
      );

      expect(result).toHaveProperty('scores');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('question');
      expect(result).toHaveProperty('postScores');
      expect(result).toHaveProperty('sentimentData');
    });

    it('should handle questions without data requirements', () => {
      const question = { id: 'test' };

      const result = enhancedAnalysisService.extractRelevantDataForQuestion(
        question,
        mockAnalysisData,
        mockPatterns
      );

      expect(result).toHaveProperty('scores');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('question');
    });

    it('should extract comment counts when required', () => {
      const question = {
        data_requirements: ['comment_counts']
      };

      const result = enhancedAnalysisService.extractRelevantDataForQuestion(
        question,
        mockAnalysisData,
        mockPatterns
      );

      expect(result).toHaveProperty('commentCounts');
      expect(result.commentCounts).toBeInstanceOf(Array);
      expect(result.commentCounts[0]).toBe(5);
    });

    it('should extract timing data when required', () => {
      const question = {
        data_requirements: ['timing_data']
      };

      const result = enhancedAnalysisService.extractRelevantDataForQuestion(
        question,
        mockAnalysisData,
        mockPatterns
      );

      expect(result).toHaveProperty('timingData');
      expect(result.timingData).toBeInstanceOf(Array);
      expect(result.timingData[0]).toBe(1640995200);
    });
  });
});