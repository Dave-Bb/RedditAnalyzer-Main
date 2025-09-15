const fs = require('fs');
const data = JSON.parse(fs.readFileSync('server/data/analyses.json', 'utf8'));

console.log('Checking sentiment values in individual_scores...');

const sentimentValues = new Set();
let totalChecked = 0;

data.forEach((analysis, i) => {
    const scores = analysis.data.analysis.individual_scores || [];
    scores.slice(0, 5).forEach(score => { // Check first 5 from each
        if (score.sentiment) {
            sentimentValues.add(score.sentiment);
            totalChecked++;
        }
    });
});

console.log(`Checked ${totalChecked} individual scores`);
console.log('Unique sentiment values found:', Array.from(sentimentValues));
console.log('Expected values: ["positive", "negative", "neutral"]');