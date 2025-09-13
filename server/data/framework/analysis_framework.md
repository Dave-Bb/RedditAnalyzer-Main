# Reddit Sentiment Analysis & Question Generation Framework
*Complete AI Agent Guide for Cross-Subreddit Analysis*

## OVERVIEW
This framework enables deep sentiment analysis of any subreddit data and generates contextually relevant questions that reveal unexpected community insights. The system adapts to different community types and uncovers patterns beyond basic positive/negative sentiment.

---

## PART 1: DATA ENHANCEMENT STRATEGIES

### Temporal Context Layering
```
ANALYZE:
- Time-of-day patterns: Map sentiment by hour to find "golden hours" vs "venting hours"
- Weekly cycles: Track emotional patterns (weekend optimism vs Monday blues)
- Event correlation: Cross-reference with external events (holidays, news, market changes)
- User journey mapping: Track sentiment evolution within comment threads
- Posting frequency vs engagement quality patterns
```

### Semantic Depth Analysis
```
BUILD COMMUNITY LEXICONS:
- Subreddit-specific jargon and emotional weight
- Sarcasm/irony detection markers
- Vulnerability indicators vs defensive language
- Authority/status signaling words
- In-group vs out-group language patterns

DETECT SUBTEXT:
- Passive-aggression markers
- Coded language (euphemisms, insider terms)
- Power dynamics in language choice
- Emotional labor distribution patterns
```

### Cross-Reference Analysis
```
CORRELATE:
- Upvote/downvote ratios vs sentiment scores
- Comment length vs engagement success
- Emoji usage vs sentiment reception
- Time-to-response vs emotional temperature
- User account age vs community acceptance
```

---

## PART 2: PATTERN DISCOVERY PROMPTS

### Unexpected Correlation Detection
```
PROMPT: "Based on this data, identify 3 unexpected correlations between [X factor] and sentiment that would surprise someone familiar with [subreddit topic]. Focus on counter-intuitive patterns that challenge common assumptions about this community."

LOOK FOR:
- High-scoring negative content (what the community celebrates that seems harsh)
- Low-scoring positive content (what genuine attempts get rejected)
- Sentiment reversals (topics that flip emotional responses unexpectedly)
- Status paradoxes (when expertise/authority gets punished)
```

### Community Values Mapping
```
PROMPT: "Identify the community's 'unspoken rules' by analyzing what gets downvoted despite being factually correct or well-intentioned. What does this reveal about the group's true values vs stated values?"

ANALYZE:
- Tone policing patterns
- Sacred cow topics (what can't be criticized)
- Gatekeeping behaviors
- Virtue signaling vs authentic expression
- Collective trauma responses
```

### Influence Network Analysis
```
PROMPT: "Map 'sentiment contagion' - how does emotional tone spread through comment chains? Identify users or comment types that consistently change thread direction."

TRACK:
- Emotional temperature shifters
- Thread hijacking patterns
- Mood amplifiers vs mood dampeners
- Authority figures vs community disruptors
```

---

## PART 3: COMMUNITY TYPE CLASSIFICATION

### Dating/Relationship Communities
**Indicators:** Dating apps, relationship advice, gender dynamics
**Key Metrics:** Vulnerability vs performance, success stories vs frustration
**Questions Focus:** Demographic comparisons, strategy effectiveness, gender dynamics

### Product/Tool Communities  
**Indicators:** Brand mentions, reviews, recommendations, technical specs
**Key Metrics:** Brand loyalty, price sensitivity, professional vs amateur usage
**Questions Focus:** Brand preferences, budget tiers, expertise levels

### Hobby/Interest Communities
**Indicators:** Skill levels, techniques, equipment discussions
**Key Metrics:** Beginner vs expert dynamics, traditional vs modern approaches
**Questions Focus:** Skill progression, regional differences, generational gaps

### Support Communities
**Indicators:** Advice seeking, emotional support, shared struggles
**Key Metrics:** Help-seeking vs help-giving, recovery patterns
**Questions Focus:** Support effectiveness, community care dynamics

### News/Politics Communities
**Indicators:** Current events, ideological positions, fact-checking
**Key Metrics:** Polarization levels, fact vs emotion balance, tribal signaling
**Questions Focus:** Information sources, persuasion patterns, consensus building

---

## PART 4: DYNAMIC QUESTION GENERATION SYSTEM

### Step 1: Context Detection Analysis
```
ANALYZE THE DATA FOR:
1. Main demographic splits (age/gender/experience/geography/income)
2. Core tension topics (most controversial discussions)
3. Primary 'us vs them' dynamics
4. Status symbols or hierarchy markers
5. Shared pain points or frustrations
6. Success/failure indicators
7. Temporal patterns (how sentiment changes over time)
```

### Step 2: Question Template Selection

**Identity-Based Communities:**
```
TEMPLATES:
- "How [demographic A] experiences [core activity] vs [demographic B]"
- "What [group 1] values in [shared context] vs what [group 2] prioritizes"
- "[Status A] users' relationship with [platform/tool] vs [status B] users"
- "[Age group 1] vs [age group 2]: different approaches to [main topic]"

EXAMPLES:
- r/Tinder: "How men feel using Tinder vs how women feel"
- r/PersonalFinance: "Millennials vs Gen Z: different money anxieties"
- r/Parenting: "First-time parents vs experienced parents: advice patterns"
```

**Product/Tool Communities:**
```
TEMPLATES:
- "Users' most trusted [product category] brand"
- "Professional vs hobbyist preferences for [tool type]"
- "Budget vs premium buyers' satisfaction with [product]"
- "[Feature A] vs [feature B]: which drives brand loyalty"

EXAMPLES:
- r/Tools: "Users' most trusted drill brand"
- r/Cars: "Toyota loyalists vs Ford defenders: different value priorities"
- r/BuyItForLife: "Budget-conscious vs buy-once philosophy: satisfaction patterns"
```

**Skill/Hobby Communities:**
```
TEMPLATES:
- "Beginners vs experts: different approaches to [core activity]"
- "Traditional methods vs modern techniques: user preferences"
- "[Subgroup A] favorite [tools/methods] vs [subgroup B]"
- "Regional differences in [hobby] preferences"

EXAMPLES:
- r/Cooking: "Home cooks vs trained chefs: recipe preference patterns"
- r/Guitar: "Self-taught vs formally trained: practice approach differences"
- r/Fitness: "Gym culture vs home workout advocates: motivation patterns"
```

### Step 3: Controversy Mining
```
PROMPT: "Analyze the top 10 most controversial topics (high engagement + mixed sentiment) and generate questions that explore the divide:"

QUESTION FORMATS:
- "What causes the split between [opposing viewpoint A] and [opposing viewpoint B]?"
- "How do users who mention [keyword X] differ from those who mention [keyword Y]?"
- "What sentiment patterns separate [high-engagement users] from [low-engagement users]?"
- "Why does [topic] consistently generate heated debates in this community?"
```

### Step 4: Pattern-Based Question Generation
```
IF brand/product mentions > 15% of comments:
→ Generate brand loyalty and preference questions

IF demographic indicators present:
→ Generate demographic comparison questions

IF skill/experience levels mentioned frequently:
→ Generate expertise gradient questions

IF geographical references common:
→ Generate regional difference questions

IF temporal patterns evident (old vs new):
→ Generate evolution/change questions

IF cost/price discussions prevalent:
→ Generate budget tier questions

IF emotional support language high:
→ Generate support effectiveness questions
```

---

## PART 5: SUCCESS PATTERN ANALYSIS

### Sentiment Recipe Discovery
```
ANALYZE HIGH-PERFORMING CONTENT FOR:
- Optimal comment length (short/medium/long success rates)
- Emoji usage patterns in successful posts
- Sarcasm vs sincerity effectiveness
- Quote usage and formatting preferences
- Question vs statement engagement rates
- Personal story vs general advice reception
- Timing patterns for maximum engagement
```

### Community Reaction Prediction
```
IDENTIFY PATTERNS THAT PREDICT:
- Which posts will go viral (>1000 upvotes)
- Which comments will be controversial (high replies, mixed votes)
- Which threads will be locked/moderated
- Which users will be well-received vs rejected
- Which topics consistently generate engagement
```

### Failure Pattern Recognition
```
ANALYZE LOW-PERFORMING/DOWNVOTED CONTENT FOR:
- Common mistakes that alienate the community
- Topics that seem reasonable but get rejected
- Tone/language that triggers negative responses
- Timing that leads to poor reception
- Formatting or length issues that hurt engagement
```

---

## PART 6: IMPLEMENTATION PROMPTS

### Initial Data Analysis Prompt
```
"Analyze this subreddit data comprehensively:

1. COMMUNITY PROFILING:
   - What type of community is this? (dating/product/hobby/support/news)
   - What are the main demographic indicators?
   - What's the emotional baseline (cynical/optimistic/supportive/competitive)?

2. PATTERN DISCOVERY:
   - What are the 3 most surprising sentiment patterns?
   - Which topics generate the most controversy?
   - What language choices predict success vs failure?

3. TEMPORAL ANALYSIS:
   - How does sentiment change over time periods?
   - Are there weekly/daily emotional cycles?
   - What timing factors affect engagement?

4. QUESTION GENERATION:
   Based on the analysis, generate 5 compelling comparison questions that would reveal unexpected insights about this community's dynamics."
```

### Deep Dive Analysis Prompt
```
"Perform advanced pattern analysis:

1. SENTIMENT OUTLIERS:
   - Find highly upvoted content with negative language
   - Find downvoted content that seems reasonable
   - What do these outliers reveal about community values?

2. INFLUENCE NETWORKS:
   - Which comment types change thread sentiment?
   - How does emotional contagion spread?
   - What creates viral vs buried content?

3. COMMUNITY HIERARCHIES:
   - How is status/expertise signaled and received?
   - What creates in-group vs out-group dynamics?
   - How does the community handle dissent?

4. SUCCESS FORMULAS:
   - What's the optimal length/tone/timing combination?
   - Which emotional approaches work best?
   - What separates viral content from ignored content?"
```

### Question Quality Assessment Prompt
```
"Evaluate potential questions on these criteria:

1. SURPRISE FACTOR: Would results challenge common assumptions?
2. DATA AVAILABILITY: Can we actually answer this with the data?
3. ACTIONABLE INSIGHTS: Would results be useful for users/marketers/researchers?
4. COMMUNITY RELEVANCE: Does this matter to actual community members?
5. UNIQUENESS: Is this a fresh perspective not covered elsewhere?

Score each question 1-10 on each criterion and prioritize high-scoring questions."
```

---

## PART 7: OUTPUT FORMATTING

### Layered Insight Delivery
```
STRUCTURE RESULTS AS:

LEVEL 1 - SURFACE: "What happened"
- Basic sentiment distribution
- Top engaging content
- Most common topics

LEVEL 2 - PATTERNS: "Why it happened"
- Behavioral drivers
- Community dynamics
- Success/failure factors

LEVEL 3 - PREDICTIONS: "What might happen next"
- Trend forecasting
- Engagement predictions
- Community evolution

LEVEL 4 - STRATEGY: "How to optimize"
- Actionable recommendations
- Content strategy insights
- Community engagement tips
```

### Comparative Framework
```
ALWAYS INCLUDE:
- How this community differs from similar subreddits
- Unique cultural elements driving sentiment
- Cross-pollination opportunities from other communities
- Universal vs community-specific patterns
```

---

## PART 8: QUALITY CONTROL

### Validation Checks
```
ENSURE ANALYSIS:
✓ Challenges obvious assumptions
✓ Provides actionable insights
✓ Uses concrete data evidence
✓ Avoids stereotyping
✓ Considers multiple perspectives
✓ Identifies both positive and negative patterns
✓ Suggests testable hypotheses
```

### Error Prevention
```
AVOID:
❌ Confirmation bias (only finding expected patterns)
❌ Overgeneralization from limited data
❌ Ignoring context and nuance
❌ Stereotyping demographic groups
❌ Missing sarcasm/irony
❌ Treating correlation as causation
❌ Ignoring temporal changes
```

---

This framework transforms raw Reddit data into deep community insights and generates questions that reveal the hidden dynamics driving online communities. Use it to understand not just what people say, but why they say it and how communities really function beneath the surface.