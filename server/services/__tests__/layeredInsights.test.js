const EnhancedAnalysisService = require('../enhancedAnalysisService');

describe('Layered Insights Generation', () => {
  let service;
  let mockAnalysisData;
  let mockCommunityProfile;
  let mockPatterns;
  let mockSemanticAnalysis;
  let mockCorrelations;
  let mockQuestions;
  let mockSuccessPatterns;

  beforeEach(() => {
    service = new EnhancedAnalysisService();
    
    // Mock basic analysis data
    mockAnalysisData = {
      individual_scores: [
        { score: 15, sentiment_score: 0.8, subreddit: 'test1', title: 'Positive post' },
        { score: -5, sentiment_score: -0.6, subreddit: 'test1', title: 'Negative post' },
        { score: 25, sentiment_score: 0.9, subreddit: 'test2', title: 'Very positive post' },
        { score: 10, sentiment_score: 0.3, subreddit: 'test1', title: 'Neutral post' },
        { score: -10, sentiment_score: -0.8, subreddit: 'test2', title: 'Very negative post' },
        { score: 20, sentiment_score: 0.7, subreddit: 'test1', title: 'Another positive' },
        { score: 5, sentiment_score: 0.2, subreddit: 'test2', title: 'Slightly positive' },
        { score: -2, sentiment_score: -0.3, subreddit: 'test1', title: 'Slightly negative' },
        { score: 30, sentiment_score: 0.95, subreddit: 'test2', title: 'Excellent post' },
        { score: 8, sentiment_score: 0.4, subreddit: 'test1', title: 'Good post' }
      ]
    };

    // Mock community profile
    mockCommunityProfile = {
      community_type: {
        primary: 'hobby',
        secondary: ['support'],
        confidence: 0.85
      },
      demographics: {
        age_groups: ['18-25', '26-35'],
        experience_levels: ['beginner', 'intermediate']
      }
    };

    // Mock patterns
    mockPatterns = {
      unexpectedCorrelations: [
        {
          pattern: 'Negative posts about failures get higher engagement',
          evidence: 'Statistical analysis shows correlation',
          surprise_factor: 0.9,
          community_insight: 'Community values learning from mistakes'
        },
        {
          pattern: 'Technical posts outperform casual content',
          evidence: 'Technical content averages 40% higher engagement',
          surprise_factor: 0.7,
          community_insight: 'Community prefers detailed technical discussions'
        }
      ],
      temporalPatterns: [
        {
          pattern: 'Weekend posts get more engagement',
          insight: 'Community is more active on weekends',
          confidence: 0.8,
          evidence: 'Weekend posts average 25% higher scores'
        }
      ]
    };

    // Mock semantic analysis
    mockSemanticAnalysis = {
      community_lexicon: {
        jargon_terms: ['API', 'framework', 'deployment', 'debugging', 'optimization']
      },
      authority_signaling: {
        expertise_claims: ['senior developer', 'years of experience', 'industry expert']
      },
      vulnerability_patterns: {
        vulnerability_indicators: ['struggling with', 'need help', 'confused about'],
        emotional_labor: ['supporting newcomers', 'explaining concepts']
      }
    };

    // Mock correlations
    mockCorrelations = {
      correlations: {
        votingSentiment: { coefficient: 0.7, significance: 0.05 },
        lengthEngagement: { coefficient: 0.6, significance: 0.03 }
      }
    };

    // Mock questions
    mockQuestions = [
      {
        id: 'q1',
        question: 'Why do technical posts perform better than casual ones?',
        surpriseFactor: 0.8,
        category: 'behavioral'
      },
      {
        id: 'q2',
        question: 'What drives weekend engagement patterns?',
        surpriseFactor: 0.9,
        category: 'temporal'
      }
    ];

    // Mock success patterns
    mockSuccessPatterns = {
      highPerformingContent: {
        optimalLength: { min: 100, max: 500 },
        bestTiming: ['weekend', 'evening'],
        effectiveFormats: ['technical_guide', 'problem_solution'],
        successfulEmojis: ['🔧', '💡', '🚀']
      },
      failurePatterns: {
        commonMistakes: ['too_short', 'no_examples', 'unclear_title'],
        rejectionTriggers: ['self_promotion', 'off_topic'],
        downvotePatterns: ['argumentative_tone', 'factual_errors']
      }
    };
  });

  afterEach(() => {
    if (service.cleanupInterval) {
      clearInterval(service.cleanupInterval);
    }
  });

  describe('generateLayeredInsights', () => {
    test('should generate complete layered insights structure', async () => {
      const result = await service.generateLayeredInsights(
        'test-analysis-id',
        mockAnalysisData,
        mockCommunityProfile,
        mockPatterns,
        mockSemanticAnalysis,
        mockCorrelations,
        mockQuestions,
        mockSuccessPatterns
      );

      expect(result).toHaveProperty('surface');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('predictions');
      expect(result).toHaveProperty('strategy');
      expect(result).toHaveProperty('comparative');
      expect(result).toHaveProperty('metadata');

      expect(Array.isArray(result.surface)).toBe(true);
      expect(Array.isArray(result.patterns)).toBe(true);
      expect(Array.isArray(result.predictions)).toBe(true);
      expect(Array.isArray(result.strategy)).toBe(true);

      expect(result.metadata).toHaveProperty('generatedAt');
      expect(result.metadata).toHaveProperty('analysisId', 'test-analysis-id');
      expect(result.metadata).toHaveProperty('totalInsights');
      expect(result.metadata).toHaveProperty('confidenceScore');
    });

    test('should handle errors gracefully and return fallback insights', async () => {
      // Mock an error in one of the generation methods
      const originalMethod = service.generateSurfaceInsights;
      service.generateSurfaceInsights = jest.fn().mockRejectedValue(new Error('Test error'));

      const result = await service.generateLayeredInsights(
        'test-analysis-id',
        mockAnalysisData,
        mockCommunityProfile,
        mockPatterns,
        mockSemanticAnalysis,
        mockCorrelations,
        mockQuestions,
        mockSuccessPatterns
      );

      expect(result).toHaveProperty('surface');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('predictions');
      expect(result).toHaveProperty('strategy');
      expect(result.metadata).toHaveProperty('error');

      // Restore original method
      service.generateSurfaceInsights = originalMethod;
    });
  });

  describe('generateSurfaceInsights', () => {
    test('should generate surface-level insights from analysis data', async () => {
      const result = await service.generateSurfaceInsights(mockAnalysisData, mockCommunityProfile, mockPatterns);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Check for expected insight types
      const insightTitles = result.map(insight => insight.title);
      expect(insightTitles).toContain('Community Engagement Overview');
      expect(insightTitles).toContain('Sentiment Distribution');
      expect(insightTitles).toContain('Community Classification');
      expect(insightTitles).toContain('Activity Scope');

      // Verify insight structure
      result.forEach(insight => {
        expect(insight).toHaveProperty('title');
        expect(insight).toHaveProperty('description');
        expect(insight).toHaveProperty('data');
        expect(typeof insight.title).toBe('string');
        expect(typeof insight.description).toBe('string');
        expect(typeof insight.data).toBe('object');
      });
    });

    test('should handle empty data gracefully', async () => {
      const emptyData = { individual_scores: [] };
      const result = await service.generateSurfaceInsights(emptyData, mockCommunityProfile, mockPatterns);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('No Data Available');
    });

    test('should calculate correct sentiment distribution', async () => {
      const result = await service.generateSurfaceInsights(mockAnalysisData, mockCommunityProfile, mockPatterns);
      
      const sentimentInsight = result.find(insight => insight.title === 'Sentiment Distribution');
      expect(sentimentInsight).toBeDefined();
      expect(sentimentInsight.data).toHaveProperty('positive_percentage');
      expect(sentimentInsight.data).toHaveProperty('negative_percentage');
      expect(sentimentInsight.data).toHaveProperty('neutral_percentage');
      expect(sentimentInsight.data).toHaveProperty('dominant_sentiment');

      // Verify percentages add up to 100
      const total = sentimentInsight.data.positive_percentage + 
                   sentimentInsight.data.negative_percentage + 
                   sentimentInsight.data.neutral_percentage;
      expect(total).toBe(100);
    });
  });

  describe('generatePatternInsights', () => {
    test('should generate pattern-level insights with behavioral drivers', async () => {
      const result = await service.generatePatternInsights(mockPatterns, mockSemanticAnalysis, mockCorrelations, mockCommunityProfile);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Verify insight structure
      result.forEach(insight => {
        expect(insight).toHaveProperty('title');
        expect(insight).toHaveProperty('description');
        expect(insight).toHaveProperty('behavioralDrivers');
        expect(insight).toHaveProperty('evidence');
        expect(Array.isArray(insight.behavioralDrivers)).toBe(true);
        expect(Array.isArray(insight.evidence)).toBe(true);
      });
    });

    test('should extract behavioral drivers from patterns', async () => {
      const result = await service.generatePatternInsights(mockPatterns, mockSemanticAnalysis, mockCorrelations, mockCommunityProfile);
      
      const patternInsight = result.find(insight => insight.title.includes('Behavioral Pattern'));
      if (patternInsight) {
        expect(patternInsight.behavioralDrivers.length).toBeGreaterThan(0);
        expect(patternInsight.behavioralDrivers).toContain('skill_development'); // hobby community driver
      }
    });

    test('should include semantic analysis insights', async () => {
      const result = await service.generatePatternInsights(mockPatterns, mockSemanticAnalysis, mockCorrelations, mockCommunityProfile);
      
      const languageInsight = result.find(insight => insight.title === 'Community Language Patterns');
      expect(languageInsight).toBeDefined();
      expect(languageInsight.behavioralDrivers).toContain('identity_formation');
      expect(languageInsight.evidence[0].data.jargon_terms).toEqual(expect.arrayContaining(['API', 'framework']));
    });
  });

  describe('generatePredictionInsights', () => {
    test('should generate prediction insights with confidence scores', async () => {
      const result = await service.generatePredictionInsights(mockAnalysisData, mockPatterns, mockSuccessPatterns, mockCommunityProfile);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Verify prediction structure
      result.forEach(prediction => {
        expect(prediction).toHaveProperty('title');
        expect(prediction).toHaveProperty('description');
        expect(prediction).toHaveProperty('trendAnalysis');
        expect(prediction).toHaveProperty('confidence');
        expect(prediction).toHaveProperty('timeframe');
        expect(typeof prediction.confidence).toBe('number');
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
      });
    });

    test('should predict engagement trends from data', async () => {
      const result = await service.generatePredictionInsights(mockAnalysisData, mockPatterns, mockSuccessPatterns, mockCommunityProfile);
      
      const engagementPrediction = result.find(prediction => prediction.title.includes('Engagement Trend'));
      expect(engagementPrediction).toBeDefined();
      expect(engagementPrediction.trendAnalysis).toContain('Recent average engagement');
    });

    test('should include community evolution predictions', async () => {
      const result = await service.generatePredictionInsights(mockAnalysisData, mockPatterns, mockSuccessPatterns, mockCommunityProfile);
      
      const evolutionPrediction = result.find(prediction => prediction.title === 'Hobby Community Diversification');
      expect(evolutionPrediction).toBeDefined();
      expect(evolutionPrediction.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('generateStrategyInsights', () => {
    test('should generate actionable strategy recommendations', async () => {
      const result = await service.generateStrategyInsights(mockCommunityProfile, mockPatterns, mockSuccessPatterns, mockQuestions);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Verify strategy structure
      result.forEach(strategy => {
        expect(strategy).toHaveProperty('title');
        expect(strategy).toHaveProperty('description');
        expect(strategy).toHaveProperty('recommendations');
        expect(strategy).toHaveProperty('expectedOutcome');
        expect(Array.isArray(strategy.recommendations)).toBe(true);
        expect(strategy.recommendations.length).toBeGreaterThan(0);
      });
    });

    test('should provide community-type specific strategies', async () => {
      const result = await service.generateStrategyInsights(mockCommunityProfile, mockPatterns, mockSuccessPatterns, mockQuestions);
      
      const typeStrategy = result.find(strategy => strategy.title === 'Hobby Community Growth Strategy');
      expect(typeStrategy).toBeDefined();
      expect(typeStrategy.recommendations).toContain('Create skill-level appropriate content and discussions');
    });

    test('should include content optimization strategies', async () => {
      const result = await service.generateStrategyInsights(mockCommunityProfile, mockPatterns, mockSuccessPatterns, mockQuestions);
      
      const contentStrategy = result.find(strategy => strategy.title === 'Content Optimization Strategy');
      expect(contentStrategy).toBeDefined();
      expect(contentStrategy.recommendations.some(rec => rec.includes('100') && rec.includes('500'))).toBe(true);
    });
  });

  describe('performComparativeAnalysis', () => {
    test('should perform internal temporal comparison with sufficient data', async () => {
      const result = await service.performComparativeAnalysis('test-id', mockAnalysisData, mockCommunityProfile);

      expect(result).toHaveProperty('available', true);
      expect(result).toHaveProperty('type', 'temporal_internal');
      expect(result).toHaveProperty('periods');
      expect(result).toHaveProperty('changes');
      expect(result).toHaveProperty('insights');

      expect(result.periods).toHaveProperty('early');
      expect(result.periods).toHaveProperty('late');
      expect(result.changes).toHaveProperty('engagement');
      expect(result.changes).toHaveProperty('sentiment');
    });

    test('should handle insufficient data gracefully', async () => {
      const smallData = { individual_scores: [{ score: 1 }, { score: 2 }] };
      const result = await service.performComparativeAnalysis('test-id', smallData, mockCommunityProfile);

      expect(result).toHaveProperty('available', false);
      expect(result).toHaveProperty('reason');
      expect(result.reason).toContain('Insufficient data');
    });
  });

  describe('calculateOverallConfidence', () => {
    test('should calculate weighted confidence score', () => {
      const surfaceInsights = [{ title: 'Test' }, { title: 'Test2' }];
      const patternInsights = [{ title: 'Pattern', evidence: [{ confidence: 0.8 }] }];
      const predictionInsights = [{ title: 'Prediction', confidence: 0.7 }];
      const strategyInsights = [{ title: 'Strategy' }];

      const confidence = service.calculateOverallConfidence(
        surfaceInsights,
        patternInsights,
        predictionInsights,
        strategyInsights
      );

      expect(typeof confidence).toBe('number');
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    test('should handle empty insights arrays', () => {
      const confidence = service.calculateOverallConfidence([], [], [], []);
      expect(confidence).toBe(0.5); // Default fallback
    });
  });

  describe('Helper Methods', () => {
    describe('extractBehavioralDrivers', () => {
      test('should extract drivers from correlation patterns', () => {
        const correlation = {
          pattern: 'Negative posts about failures get higher engagement'
        };
        
        const drivers = service.extractBehavioralDrivers(correlation, mockCommunityProfile);
        
        expect(Array.isArray(drivers)).toBe(true);
        expect(drivers).toContain('authenticity_preference');
        expect(drivers).toContain('skill_development'); // hobby community
      });

      test('should include community-specific drivers', () => {
        const supportProfile = {
          community_type: { primary: 'support' }
        };
        
        const drivers = service.extractBehavioralDrivers({}, supportProfile);
        
        expect(drivers).toContain('help_seeking');
        expect(drivers).toContain('empathy_expression');
      });
    });

    describe('predictCommunityEvolution', () => {
      test('should provide type-specific evolution predictions', () => {
        const prediction = service.predictCommunityEvolution('hobby', mockPatterns, mockSuccessPatterns);
        
        expect(prediction).toHaveProperty('title');
        expect(prediction).toHaveProperty('description');
        expect(prediction).toHaveProperty('confidence');
        expect(prediction).toHaveProperty('timeframe');
        expect(prediction.title).toBe('Hobby Community Diversification');
      });

      test('should provide fallback for unknown community types', () => {
        const prediction = service.predictCommunityEvolution('unknown', mockPatterns, mockSuccessPatterns);
        
        expect(prediction.title).toBe('General Community Evolution');
        expect(prediction.confidence).toBe(0.6);
      });
    });

    describe('generateCommunityTypeStrategy', () => {
      test('should provide hobby-specific strategies', () => {
        const strategy = service.generateCommunityTypeStrategy('hobby', mockCommunityProfile);
        
        expect(strategy.title).toBe('Hobby Community Growth Strategy');
        expect(strategy.recommendations).toContain('Create skill-level appropriate content and discussions');
      });

      test('should provide fallback for unknown types', () => {
        const strategy = service.generateCommunityTypeStrategy('unknown', mockCommunityProfile);
        
        expect(strategy.title).toBe('General Community Optimization');
      });
    });
  });
});