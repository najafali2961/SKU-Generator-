const fs = require('fs');

const homePath = '/Users/app/Desktop/BulkProducts/resources/js/Pages/Home.jsx';
const creditsPath = '/Users/app/Desktop/BulkProducts/resources/js/Pages/CreditsSpeedometerCard.jsx';
const jobsPath = '/Users/app/Desktop/BulkProducts/resources/js/Pages/RecentJobsTable.jsx';

// We want a middle-way purple.
// Header is linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #6366f1 100%)
// Let's use #4c1d95 (purple-900) as the background and #5b21b6 (purple-800) for borders.
// Or #581c87 (purple-900 in newer tailwind) and #6b21a8 (purple-800).
// Or maybe a slightly lighter #6d28d9.
// Let's use #4c1d95 for background and #6d28d9 for borders.

let homeContent = fs.readFileSync(homePath, 'utf8');
homeContent = homeContent.replace(/#1e1b2e/g, '#4c1d95');
homeContent = homeContent.replace(/#362d59/g, '#6d28d9');
// Remove the <Card> wrapper around RecentJobsTable in Home.jsx
// It looks like:
// <Card>
//     <RecentJobsTable recentJobs={recentJobs} />
// </Card>
homeContent = homeContent.replace(/<Card>\s*<RecentJobsTable recentJobs=\{recentJobs\} \/>\s*<\/Card>/, '<RecentJobsTable recentJobs={recentJobs} />');

// also ensure grid cards stretch properly
// replace .airo-top-grid > div { margin-bottom: 16px; } with flex
homeContent = homeContent.replace(/\.airo-top-grid > div \{[\s\S]*?\}/g, '.airo-top-grid > div { display: flex; flex-direction: column; }');

// Make sure the action cards have a uniform height. The Action and Stat grids are in InlineGrid, but the cards should have height: 100%
// The .airo-card-dark already has height: 100%.

fs.writeFileSync(homePath, homeContent);


let creditsContent = fs.readFileSync(creditsPath, 'utf8');
creditsContent = creditsContent.replace(/#1e1b2e/g, '#4c1d95');
creditsContent = creditsContent.replace(/#362d59/g, '#6d28d9');
fs.writeFileSync(creditsPath, creditsContent);


let jobsContent = fs.readFileSync(jobsPath, 'utf8');
jobsContent = jobsContent.replace(/#1e1b2e/g, '#4c1d95');
jobsContent = jobsContent.replace(/#362d59/g, '#6d28d9');
// Make the border bottom on headers stand out
jobsContent = jobsContent.replace(/1px solid #362d59/g, '1px solid #6d28d9');

// The hover states were rgba(139, 92, 246, 0.15) or rgba(255,255,255,0.03)
// Let's make hover a bit lighter purple: #5b21b6 (rgba(91, 33, 182, 0.5))
jobsContent = jobsContent.replace(/rgba\(255,255,255,0\.03\)/g, '#5b21b6');

fs.writeFileSync(jobsPath, jobsContent);
console.log("SUCCESS");
