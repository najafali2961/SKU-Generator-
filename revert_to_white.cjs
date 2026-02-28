const fs = require('fs');

// 1. Home.jsx
const homePath = '/Users/app/Desktop/BulkProducts/resources/js/Pages/Home.jsx';
let homeContent = fs.readFileSync(homePath, 'utf8');

homeContent = homeContent.replace(/const styles = `[\s\S]*?`;/, `const styles = \`
    .airo-hero {
        background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #6366f1 100%);
        border-radius: 12px;
        padding: 24px 28px;
        color: #fff;
        position: relative;
        overflow: hidden;
    }
    .airo-hero::before {
        content: '';
        position: absolute;
        top: -40%;
        right: -15%;
        width: 250px;
        height: 250px;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
    }
    .airo-feedback-btn {
        background: rgba(255,255,255,0.15);
        color: #fff;
        border: 1.5px solid rgba(255,255,255,0.4);
        border-radius: 8px;
        padding: 6px 16px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
    }
    .airo-feedback-btn:hover {
        background: rgba(255,255,255,0.25);
        border-color: #fff;
    }
    .airo-card-white {
        background: #fff;
        border: 1px solid #ebebeb;
        border-radius: 12px;
        padding: 24px;
        color: #202223;
        transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .airo-action-card {
        cursor: pointer;
    }
    .airo-action-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px -8px rgba(0,0,0,0.1);
        border-color: #c4b5fd;
    }
    .airo-icon-circle {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f3f0ff;
        color: #7c3aed;
        flex-shrink: 0;
    }
    .airo-action-btn {
        background: #7c3aed;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
    }
    .airo-action-btn:hover {
        background: #6d28d9;
    }
    .airo-giveaway {
        background: #fff;
        border: 1px solid #ebebeb;
        border-radius: 12px;
        padding: 20px 24px;
        color: #202223;
        height: 100%;
        display: flex;
        align-items: left;
        position: relative;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .airo-close-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 10;
        background: #f1f2f3;
        border: none;
        border-radius: 50%;
        width: 26px;
        height: 26px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6d7175;
        transition: background 0.2s, color 0.2s;
    }
    .airo-close-btn:hover {
        background: #e4e5e7;
        color: #202223;
    }
    .airo-claim-btn {
        background: #7c3aed;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 8px 18px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: background 0.2s;
        flex-shrink: 0;
    }
    .airo-claim-btn:hover {
        background: #6d28d9;
    }
    .airo-top-grid {
        display: block;
    }
    @media (min-width: 768px) {
        .airo-top-grid {
            display: grid;
            gap: 16px;
            grid-template-columns: 1.15fr 2fr;
            align-items: stretch;
        }
    }
    .airo-top-grid > div { display: flex; flex-direction: column; }
    .airo-star {
        cursor: pointer;
        transition: transform 0.12s;
    }
    .airo-star:hover {
        transform: scale(1.15);
    }
\`;`);


// Replace <Layout> mapping with <div className="airo-top-grid">
homeContent = homeContent.replace(/<Layout>/g, '<div className="airo-top-grid">');
homeContent = homeContent.replace(/<Layout\.Section variant="oneThird">/g, '<div style={{ display: "flex", flex: 1 }}>');
homeContent = homeContent.replace(/<\/Layout\.Section>\s*<Layout\.Section>/g, '</div>\n                    <div style={{ display: "flex", flex: 1 }}>');
homeContent = homeContent.replace(/<\/Layout\.Section>\s*<\/Layout>/g, '</div>\n                </div>');

// Ensure empty div takes space properly if giveaway missing
homeContent = homeContent.replace(/\{\s*!\s*isGiveawayDismissed\s*&&\s*!\s*has_claimed_giveaway\s*&&\s*\(/, '(!isGiveawayDismissed && !has_claimed_giveaway) ? (');
homeContent = homeContent.replace(/<\/div>\s*\)\s*\}/, '</div>\n                        ) : <div /> }');


// Replace dark classes with white
homeContent = homeContent.replace(/airo-card-dark/g, 'airo-card-white');

// Un-force color spans since Polaris Text manages color nicely
homeContent = homeContent.replace(/<span style=\{\{\s*color:\s*"(?:#fff|#9ca3af)"\s*\}\}>/g, '<span>');
homeContent = homeContent.replace(/<span style=\{\{\s*color:\s*"rgba\(255,255,255,0\.8\)"\s*\}\}>/g, '<span>');


fs.writeFileSync(homePath, homeContent);

// 2. CreditsSpeedometerCard.jsx
const creditsPath = '/Users/app/Desktop/BulkProducts/resources/js/Pages/CreditsSpeedometerCard.jsx';
let creditsContent = fs.readFileSync(creditsPath, 'utf8');

// Replace wrapper and inline span colors
creditsContent = creditsContent.replace(/<div className="airo-card-(?:white|dark)" style=\{\{[\s\S]*?\}\}>/, `<div className="airo-card-white" style={{
            borderRadius: "12px",
            padding: "24px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: "#fff",
            border: "1px solid #ebebeb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}>`);
creditsContent = creditsContent.replace(/<span style=\{\{\s*color:\s*"(?:#fff|#9ca3af|inherit)",?\s*\}\}\s*>/g, '<span>');

// Fix the SVG background stroke
creditsContent = creditsContent.replace(/stroke="#[a-zA-Z0-9]+"/g, (match) => {
    if (match === 'stroke="#7c3aed"') return match; // active progress ring
    return 'stroke="#e1e3e5"'; // background ring
});

// Restore the SVG text color
creditsContent = creditsContent.replace(/fill="#[a-zA-Z0-9]+"/g, (match) => {
    if (match === 'fill="#fff"' || match === 'fill="#202223"') return 'fill="#202223"';
    if (match === 'fill="#9ca3af"' || match === 'fill="#6d7175"') return 'fill="#6d7175"';
    return match;
});

// Restore checkmarks / circles background
creditsContent = creditsContent.replace(/background:\s*"(?:#f3f0ff|rgba\(124, 58, 237, 0\.15\))"/g, 'background: "#f3f0ff"');


fs.writeFileSync(creditsPath, creditsContent);


// 3. RecentJobsTable.jsx
const jobsPath = '/Users/app/Desktop/BulkProducts/resources/js/Pages/RecentJobsTable.jsx';
let jobsContent = fs.readFileSync(jobsPath, 'utf8');

// The outer wrapper
const jobsWrapperRegex = /<div\s+style=\{\{\s*background: "[^"]+"[\s\S]*?\}\}\s*>\s*<style>[\s\S]*?<\/style>\s*<div className="airo-dark-jobs">/;
jobsContent = jobsContent.replace(jobsWrapperRegex, `<Card padding="0"><div className="airo-jobs-white">`);

// Outer ending tags
jobsContent = jobsContent.replace(/<\/div>\s*<\/div>\s*\)\s*;\s*}\s*$/, '</div></Card>);\n}');

// Restore header borders and simple background
jobsContent = jobsContent.replace(/borderBottom:\s*"1px solid #[a-zA-Z0-9]+"/g, 'borderBottom: "1px solid #ebebeb"');
jobsContent = jobsContent.replace(/backgroundColor:\s*"(?:#fafafa|#f9fafb|#5b21b6|transparent|rgba\(139, 92, 246, 0\.1\))"/g, (match) => {
    if (match.includes('139') || match.includes('f9fafb')) return 'backgroundColor: "#f9fafb"';
    if (match.includes('transparent')) return 'backgroundColor: "transparent"';
    return 'backgroundColor: "#fafafa"';
});
jobsContent = jobsContent.replace(/borderBottom:\s*"1px solid rgba[^\"]+"/g, 'borderBottom: "1px solid #ebebeb"');
jobsContent = jobsContent.replace(/<span style=\{\{\s*color:\s*"(?:#fff|#9ca3af)",?\s*\}\}\s*>/g, '<span>');


fs.writeFileSync(jobsPath, jobsContent);
console.log('SUCCESS');
