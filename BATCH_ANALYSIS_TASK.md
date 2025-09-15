# Batch Analysis Pre-Generation Task

## Objective
Pre-generate comprehensive Reddit sentiment analyses for hackathon showcase to demonstrate the full capabilities of the site, bypassing live API limitations.

## Why This is Needed
- The live version has limitations that prevent showcasing the full potential
- Need sample data to show what the site can do during the hackathon
- Pre-fetched analyses will serve as a showcase for visitors

## Current Status
✅ Batch analysis script created (`batch_analysis_generator.js`)
✅ Progress logging and timeout handling implemented
✅ Data format conversion fixed to match client expectations
✅ Site protection - no changes to working functionality

## Immediate Task
**Test the pre-generation system with one analysis to verify it works end-to-end.**

### Test Configuration
- **Subreddit**: worldnews (or any active subreddit)
- **Post limit**: 5 posts
- **Date range**: Recent (2025-09-10 to 2025-09-14)
- **Expected time**: 1-3 minutes
- **Goal**: Verify the batch script generates proper data that the site can display

### Command to Run
```bash
cd "C:\Users\david\OneDrive\Documents\Dev\LovableSlop\Reddit analyzer"
node batch_analysis_generator.js
```

## Next Steps (After Test Success)
1. Update `ANALYSIS_CONFIG` in batch script with showcase analyses:
   - Ukraine invasion analysis (worldnews, 50 posts)
   - Trump victory analysis (Conservative vs politics, 40 posts each)
   - Game of Thrones S8 disaster (gameofthrones + freefolk, 30 posts each)
   - Other high-engagement topics

2. Run full batch generation (will take hours - that's expected)

3. Generated files will be saved to `client/src/data/generated/`

4. Update `generatedFiles` array in `History.tsx` with actual generated file names

## Files Involved
- **Main script**: `batch_analysis_generator.js`
- **Generated data**: `client/src/data/generated/*.json`
- **Client integration**: `client/src/components/History.tsx`
- **Data types**: `client/src/types.ts`

## Key Features of Batch Script
- ✅ Progress logging every 30 seconds
- ✅ 30-minute timeout for large analyses
- ✅ Resume capability (skips already completed analyses)
- ✅ Synthetic post generation
- ✅ Data format conversion for client compatibility
- ✅ Error handling and retry logic

## Success Criteria
1. Script runs without errors
2. Generates JSON file in correct format
3. Site can load and display the pre-generated analysis
4. All features work (charts, synthetic posts, insights)

---

**Current Priority**: Run the test analysis to verify the system works, then scale up to full showcase generation.