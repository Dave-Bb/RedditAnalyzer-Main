const fs = require('fs');
const data = JSON.parse(fs.readFileSync('server/data/analyses.json', 'utf8'));

console.log('Total analyses:', data.length);
console.log('First analysis individual_scores count:', data[0].data.analysis.individual_scores.length);
console.log('Sample individual score:', JSON.stringify(data[0].data.analysis.individual_scores[0], null, 2));

// Check total individual scores across all analyses
let totalScores = 0;
data.forEach((analysis, i) => {
    const count = analysis.data.analysis.individual_scores.length;
    totalScores += count;
    console.log(`Analysis ${i + 1}: ${count} individual scores`);
});
console.log('TOTAL individual scores:', totalScores);