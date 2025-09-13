const EnhancedAnalysisService = require('../enhancedAnalysisService');

describe('Success Pattern Analysis', () => {
  let service;
  let mockAnalysisData;
  let mockCommunityProfile;

  beforeEach(() => {
    service = new EnhancedAnalysisService();
    
    // Mock analysis data with varied performance scores
    mockAnalysisData = {
      individual_scores: [
        // High performers
        { title: 'Detailed Tutorial: How to Build X', body: 'This is a comprehensive guide with step-by-step instructions...', score: 150, sentiment_score: 0.8, subreddit: 'test' },
        { title: 'Amazing Results from Following This Method', body: 'I tried the technique mentioned here and got incredible results. Here are the details...', score: 120, sentiment_score: 0.7, subreddit: 'test' },
        { title: 'Question: What are your thoughts on this approach?', body: 'I have been experimenting with different methods and would love to hear your experiences...', score: 100, sentiment_score: 0.6, subreddit: 'test' },
        
        // Medium performers
        { title: 'Some thoughts on topic X', body: 'Here are my thoughts...', score: 50, sentiment_score: 0.3, subreddit: 'test' },
        { title: 'Update on my project', body: 'Quick update...', score: 30, sentiment_score: 0.2, subreddit: 'test' },
        
        // Poor performers
        { title: 'Help', body: 'Need help', score: -5, sentiment_score: -0.2, subreddit: 'test' },
        { title: 'Bad post', body: '', score: -10, sentiment_score: -0.5, subreddit: 'test' },
        { title: 'Spam content here', body: 'Buy my product now!', score: -20, sentiment_score: -0.8, subreddit: 'test' }
      ]
    };

    mockCommunityProfile = {
      community_type: {
        primary: 'hobby',
        secondary: ['support'],
        confidence: 0.8
      }
    };
  });

  afterEach(() => {
    if (service.cleanupInterval) {
      clearInterval(service.cleanupInterval);
    }
  });

  describe('analyzeSuccessAndFailurePatterns', () => {
    test('should analyze success and failure patterns successfully', async () => {
      const analysisId = 'test-analysis-1';
      
      const result = await service.analyzeSuccessAndFailurePatterns(
        analysisId, 
        mockAnalysisData, 
        mockCommunityProfile
      );

      expect(result).toBeDefined();
      expect(result.highPerformingContent).toBeDefined();
      expect(result.engagementPrediction).toBeDefined();
      expect(result.failurePatterns).toBeDefined();
      expect(result.optimizationRecommendations).toBeDefined();
      expect(result.analysisMetadata).toBeDefined();
      
      expect(result.analysisMetadata.postsAnalyzed).toBe(8);
      expect(result.analysisMetadata.communityType).toBe('hobby');
    });

    test('should handle empty data gracefully', async () => {
      const analysisId = 'test-analysis-2';
      const emptyData = { individual_scores: [] };
      
      const result = await service.analyzeSuccessAndFailurePatterns(
        analysisId, 
        emptyData, 
        mockCommunityProfile
      );

      expect(result).toBeDefined();
      expect(result.analysisMetadata.error).toBeDefined();
      expect(result.highPerformingContent.patterns).toEqual([]);
    });

    test('should handle missing individual_scores', async () => {
      const analysisId = 'test-analysis-3';
      const invalidData = {};
      
      const result = await service.analyzeSuccessAndFailurePatterns(
        analysisId, 
        invalidData, 
        mockCommunityProfile
      );

      expect(result).toBeDefined();
      expect(result.analysisMetadata.error).toBeDefined();
    });
  });

  describe('analyzeHighPerformingContent', () => {
    test('should identify optimal content length patterns', async () => {
      const analysisId = 'test-analysis-4';
      const scores = mockAnalysisData.individual_scores;
      
      const result = await service.analyzeHighPerformingContent(analysisId, scores);

      expect(result).toBeDefined();
      expect(result.patterns).toBeDefined();
      expect(result.optimalLength).toBeDefined();
      expect(result.optimalLength.min).toBeGreaterThan(0);
      expect(result.optimalLength.max).toBeGreaterThanOrEqual(result.optimalLength.min);
      
      // Should have patterns for different aspects
      const patternTypes = result.patterns.map(p => p.type);
      expect(patternTypes).toContain('content_length');
      expect(patternTypes).toContain('timing');
      expect(patternTypes).toContain('formatting');
      expect(patternTypes).toContain('elements');
    });

    test('should analyze timing patterns', async () => {
      const analysisId = 'test-analysis-5';
      const scores = mockAnalysisData.individual_scores;
      
      const result = await service.analyzeHighPerformingContent(analysisId, scores);

      expect(result.bestTiming).toBeDefined();
      expect(result.bestTiming.bestTimes).toBeDefined();
      expect(Array.isArray(result.bestTiming.bestTimes)).toBe(true);
      expect(result.bestTiming.confidence).toBeGreaterThan(0);
    });

    test('should identify effective formats', async () => {
      const analysisId = 'test-analysis-6';
      const scores = mockAnalysisData.individual_scores;
      
      const result = await service.analyzeHighPerformingContent(analysisId, scores);

      expect(result.effectiveFormats).toBeDefined();
      expect(result.effectiveFormats.topFormats).toBeDefined();
      expect(Array.isArray(result.effectiveFormats.topFormats)).toBe(true);
      expect(result.effectiveFormats.confidence).toBeGreaterThan(0);
    });
  });

  describe('createEngagementPredictionModel', () => {
    test('should create engagement prediction model', async () => {
      const analysisId = 'test-analysis-7';
      const scores = mockAnalysisData.individual_scores;
      
      const result = await service.createEngagementPredictionModel(
        analysisId, 
        scores, 
        mockCommunityProfile
      );

      expect(result).toBeDefined();
      expect(result.model).toBeDefined();
      expect(result.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.accuracy).toBeLessThanOrEqual(1);
      expect(result.features).toBeDefined();
      expect(result.predictions).toBeDefined();
      expect(Array.isArray(result.predictions)).toBe(true);
    });

    test('should generate community-specific predictions', async () => {
      const analysisId = 'test-analysis-8';
      const scores = mockAnalysisData.individual_scores;
      
      const result = await service.createEngagementPredictionModel(
        analysisId, 
        scores, 
        mockCommunityProfile
      );

      // Should include tutorial content prediction for hobby communities
      const tutorialPrediction = result.predictions.find(p => p.contentType === 'tutorial_content');
      expect(tutorialPrediction).toBeDefined();
      expect(tutorialPrediction.predictedEngagement).toBe('very-high');
    });

    test('should extract content features correctly', () => {
      const testItem = {
        title: 'Test Question: How to do X?',
        body: 'This is a detailed explanation with http://example.com link and 🔧 emoji.',
        sentiment_score: 0.5,
        subreddit: 'test'
      };

      const features = service.extractContentFeatures(testItem);

      expect(features.titleLength).toBe(testItem.title.length);
      expect(features.bodyLength).toBe(testItem.body.length);
      expect(features.hasQuestion).toBe(true);
      expect(features.hasLinks).toBe(true);
      expect(features.hasEmojis).toBe(true);
      expect(features.sentimentScore).toBe(0.5);
    });
  });

  describe('analyzeFailurePatterns', () => {
    test('should identify failure patterns in poor-performing content', async () => {
      const analysisId = 'test-analysis-9';
      const scores = mockAnalysisData.individual_scores;
      
      const result = await service.analyzeFailurePatterns(analysisId, scores);

      expect(result).toBeDefined();
      expect(result.patterns).toBeDefined();
      expect(Array.isArray(result.patterns)).toBe(true);
      expect(result.commonMistakes).toBeDefined();
      expect(result.rejectionTriggers).toBeDefined();
      expect(result.downvotePatterns).toBeDefined();
    });

    test('should identify common mistakes', () => {
      const poorPerformers = [
        { title: 'Help', body: '', score: -5 },
        { title: 'X', body: 'Short', score: -3 },
        { title: 'Vague title', body: 'No context', score: -2 }
      ];

      const mistakes = service.identifyCommonMistakes(poorPerformers);

      expect(Array.isArray(mistakes)).toBe(true);
      expect(mistakes.length).toBeGreaterThan(0);
      expect(mistakes).toContain('overly brief content');
    });

    test('should identify rejection triggers', () => {
      const poorPerformers = [
        { title: 'Spam post', body: 'Buy now!', score: -15 },
        { title: 'Offensive content', body: 'Inappropriate', score: -10 },
        { title: 'Rule violation', body: 'Against rules', score: -8 }
      ];

      const triggers = service.identifyRejectionTriggers(poorPerformers);

      expect(Array.isArray(triggers)).toBe(true);
      expect(triggers.length).toBeGreaterThan(0);
    });
  });

  describe('generateOptimizationRecommendations', () => {
    test('should generate optimization recommendations', async () => {
      const analysisId = 'test-analysis-10';
      
      const mockHighPerforming = {
        optimalLength: { min: 100, max: 500, confidence: 0.8 },
        bestTiming: { bestTimes: ['6-9 PM weekdays'], confidence: 0.7 },
        effectiveFormats: { topFormats: ['lists', 'questions'], confidence: 0.6 }
      };
      
      const mockFailurePatterns = {
        commonMistakes: ['short content', 'vague titles'],
        patterns: [{ type: 'mistake1' }, { type: 'mistake2' }]
      };

      const result = await service.generateOptimizationRecommendations(
        analysisId,
        mockHighPerforming,
        mockFailurePatterns,
        mockCommunityProfile
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Should have different categories of recommendations
      const categories = result.map(r => r.category);
      expect(categories).toContain('content_length');
      expect(categories).toContain('community_specific');
    });

    test('should generate community-specific recommendations for hobby communities', async () => {
      const analysisId = 'test-analysis-11';
      const mockHighPerforming = { optimalLength: { confidence: 0.3 } };
      const mockFailurePatterns = { commonMistakes: [], patterns: [] };

      const result = await service.generateOptimizationRecommendations(
        analysisId,
        mockHighPerforming,
        mockFailurePatterns,
        mockCommunityProfile
      );

      const hobbyRec = result.find(r => r.category === 'community_specific');
      expect(hobbyRec).toBeDefined();
      expect(hobbyRec.recommendation).toContain('tutorial');
    });
  });

  describe('analyzeLengthPatterns', () => {
    test('should analyze content length patterns', () => {
      const topPerformers = [
        { title: 'Short title', body: 'Medium length body content here' },
        { title: 'Longer title with more words', body: 'Much longer body content with detailed explanations and examples' },
        { title: 'Another title', body: 'Another body with reasonable length' }
      ];

      const result = service.analyzeLengthPatterns(topPerformers);

      expect(result).toBeDefined();
      expect(result.optimal).toBeDefined();
      expect(result.optimal.min).toBeGreaterThan(0);
      expect(result.optimal.max).toBeGreaterThan(result.optimal.min);
      expect(result.confidence).toBeGreaterThan(0);
      expect(Array.isArray(result.evidence)).toBe(true);
    });

    test('should handle empty content gracefully', () => {
      const topPerformers = [
        { title: '', body: '' },
        { title: null, body: null }
      ];

      const result = service.analyzeLengthPatterns(topPerformers);

      expect(result).toBeDefined();
      expect(result.confidence).toBe(0.1);
    });
  });

  describe('analyzeFormatPatterns', () => {
    test('should identify formatting patterns', () => {
      const topPerformers = [
        { title: 'Question: How to do X?', body: '1. First step\n2. Second step\nhttp://example.com' },
        { title: 'Tutorial with emojis 🔧', body: '- Point one\n- Point two\nwww.example.com' },
        { title: 'Another question?', body: 'Content with * bullet points' }
      ];

      const result = service.analyzeFormatPatterns(topPerformers);

      expect(result).toBeDefined();
      expect(Array.isArray(result.topFormats)).toBe(true);
      expect(result.formatAnalysis).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('calculateCorrelation', () => {
    test('should calculate correlation between numeric arrays', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];

      const correlation = service.calculateCorrelation(x, y);

      expect(correlation).toBeCloseTo(1, 2); // Perfect positive correlation
    });

    test('should handle boolean arrays', () => {
      const x = [true, false, true, false];
      const y = [10, 5, 12, 3];

      const correlation = service.calculateCorrelation(x, y);

      expect(typeof correlation).toBe('number');
      expect(correlation).toBeGreaterThan(0); // Positive correlation expected
    });

    test('should handle empty arrays', () => {
      const correlation = service.calculateCorrelation([], []);
      expect(correlation).toBe(0);
    });

    test('should handle mismatched array lengths', () => {
      const correlation = service.calculateCorrelation([1, 2], [1, 2, 3]);
      expect(correlation).toBe(0);
    });
  });

  describe('Pattern Recognition Accuracy', () => {
    test('should identify high-performing content characteristics', async () => {
      const analysisId = 'test-accuracy-1';
      
      // Create test data with clear patterns
      const testData = {
        individual_scores: [
          // High performers - longer, detailed content
          { title: 'Comprehensive Guide: Complete Tutorial on Advanced Techniques', body: 'This is a very detailed explanation with step-by-step instructions, examples, and helpful tips that provide real value to readers...', score: 200, sentiment_score: 0.8 },
          { title: 'Detailed Analysis: What I Learned from 5 Years of Experience', body: 'After extensive research and practical application, here are the key insights and lessons learned...', score: 180, sentiment_score: 0.7 },
          
          // Poor performers - short, low-quality content
          { title: 'Help', body: 'Need help', score: -5, sentiment_score: -0.2 },
          { title: 'Quick question', body: 'Anyone?', score: -3, sentiment_score: -0.1 }
        ]
      };

      const result = await service.analyzeHighPerformingContent(analysisId, testData.individual_scores);

      // Should identify that longer content performs better
      expect(result.optimalLength.min).toBeGreaterThan(50);
      expect(result.patterns.find(p => p.type === 'content_length')).toBeDefined();
    });

    test('should predict engagement based on content features', async () => {
      const analysisId = 'test-accuracy-2';
      const scores = mockAnalysisData.individual_scores;
      
      const result = await service.createEngagementPredictionModel(
        analysisId, 
        scores, 
        mockCommunityProfile
      );

      // Model should have reasonable accuracy (> 0.1 for fallback)
      expect(result.accuracy).toBeGreaterThan(0.1);
      
      // Should include relevant features
      expect(result.features).toContain('titleLength');
      expect(result.features).toContain('hasQuestion');
      expect(result.features).toContain('sentimentScore');
    });

    test('should accurately identify failure patterns', async () => {
      const analysisId = 'test-accuracy-3';
      
      // Create test data with clear failure patterns
      const testData = [
        { title: 'H', body: '', score: -10 }, // Too short
        { title: 'Help me', body: 'pls', score: -8 }, // No context
        { title: 'BUY MY PRODUCT NOW!!!', body: 'SPAM CONTENT', score: -20 } // Spam
      ];

      const result = await service.analyzeFailurePatterns(analysisId, testData);

      expect(result.commonMistakes).toContain('overly brief content');
      expect(result.rejectionTriggers.length).toBeGreaterThan(0);
    });
  });
});