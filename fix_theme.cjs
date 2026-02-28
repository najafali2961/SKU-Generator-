const fs = require('fs');

// File paths
const homePath = '/Users/app/Desktop/BulkProducts/resources/js/Pages/Home.jsx';
const creditsPath = '/Users/app/Desktop/BulkProducts/resources/js/Pages/CreditsSpeedometerCard.jsx';
const jobsPath = '/Users/app/Desktop/BulkProducts/resources/js/Pages/RecentJobsTable.jsx';

// ---------------------------------------------------------
// 1. HOME.JSX
// ---------------------------------------------------------
let homeContent = fs.readFileSync(homePath, 'utf8');

const newStyles = `const styles = \`
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
    .airo-card-dark {
        background: #1e1b2e;
        border: 1px solid #362d59;
        border-radius: 12px;
        padding: 24px;
        color: #fff;
        transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    .airo-action-card {
        cursor: pointer;
    }
    .airo-action-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px -8px rgba(0,0,0,0.3);
        border-color: #7c3aed;
    }
    .airo-icon-circle {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(124, 58, 237, 0.15);
        color: #a78bfa;
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
        background: #1e1b2e;
        border: 1px solid #362d59;
        border-radius: 12px;
        padding: 20px 24px;
        color: #fff;
        height: 100%;
        display: flex;
        align-items: center;
        position: relative;
        overflow: hidden;
    }
    .airo-close-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 10;
        background: rgba(255,255,255,0.05);
        border: none;
        border-radius: 50%;
        width: 26px;
        height: 26px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9ca3af;
        transition: background 0.2s, color 0.2s;
    }
    .airo-close-btn:hover {
        background: rgba(255,255,255,0.15);
        color: #fff;
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
        }
    }
    .airo-top-grid > div {
        margin-bottom: 16px;
    }
    @media (min-width: 768px) {
        .airo-top-grid > div {
            margin-bottom: 0;
        }
    }
    .airo-star {
        cursor: pointer;
        transition: transform 0.12s;
    }
    .airo-star:hover {
        transform: scale(1.15);
    }
\`;`;

if (homeContent.includes('const styles = `')) {
    homeContent = homeContent.replace(/const styles = `[\s\S]*?`;/, newStyles);
}

const oldLayoutRegex = /<Layout>\s*<Layout\.Section variant="oneThird">\s*<CreditsSpeedometerCard credits=\{credits\} \/>\s*<\/Layout\.Section>\s*<Layout\.Section>\s*\{\/\* ── Giveaway Banner ── \*\/\}\s*\{!isGiveawayDismissed && !has_claimed_giveaway && \([\s\S]*?\}\)\s*<\/Layout\.Section>\s*<\/Layout>/;

const newLayout = `<div className="airo-top-grid">
                    <div>
                        <CreditsSpeedometerCard credits={credits} />
                    </div>
                    {(!isGiveawayDismissed && !has_claimed_giveaway) ? (
                        <div className="airo-giveaway">
                            <button className="airo-close-btn" onClick={() => setIsGiveawayDismissed(true)}>
                                <Icon source={XIcon} />
                            </button>
                            <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
                                <InlineStack align="space-between" blockAlign="center" wrap={false}>
                                    <InlineStack gap="400" blockAlign="center">
                                        <span style={{ fontSize: 36 }}>🎁</span>
                                        <BlockStack gap="050">
                                            <InlineStack gap="100" blockAlign="center">
                                                <span style={{ fontSize: 12 }}>✨</span>
                                                <Text as="p" variant="headingSm" fontWeight="bold">
                                                    <span style={{ color: "#fff" }}>Special Giveaway</span>
                                                </Text>
                                            </InlineStack>
                                            <Text as="p" variant="bodyMd">
                                                <span style={{ color: "#fff" }}>Claim your <strong>Free Credits!</strong></span>
                                            </Text>
                                            <Text as="p" variant="bodySm">
                                                <span style={{ color: "#9ca3af" }}>Chat with our support team to claim yours instantly.</span>
                                            </Text>
                                        </BlockStack>
                                    </InlineStack>
                                    <button className="airo-claim-btn" onClick={() => {
                                        if (window.$crisp) {
                                            window.$crisp.push(["do", "chat:open"]);
                                            window.$crisp.push(["do", "message:send", ["text", "Hello! I am here to claim my free giveaway credits for my store! 🎁"]]);
                                        } else {
                                            window.open("mailto:support@airoapps.com?subject=Giveaway Credits Claim", "_blank");
                                        }
                                    }}>
                                        Chat to Claim
                                        <Icon source={ArrowRightIcon} />
                                    </button>
                                </InlineStack>
                            </div>
                        </div>
                    ) : <div style={{ display: 'none' }} />}
                </div>`;

if (oldLayoutRegex.test(homeContent)) {
    homeContent = homeContent.replace(oldLayoutRegex, newLayout);
}

// Ensure cards are updated
homeContent = homeContent.replace(/<div className="airo-card-dark airo-action-card">/g, '@@ACTION_CARD@@');
homeContent = homeContent.replace(/<div className="airo-action-card">/g, '@@ACTION_CARD@@');
homeContent = homeContent.replace(/@@ACTION_CARD@@/g, '<div className="airo-card-dark airo-action-card">');

homeContent = homeContent.replace(/<div className="airo-card-dark">/g, '@@STAT_CARD@@');
homeContent = homeContent.replace(/<div className="airo-stat-card">/g, '@@STAT_CARD@@');
homeContent = homeContent.replace(/@@STAT_CARD@@/g, '<div className="airo-card-dark">');

homeContent = homeContent.replace(/className="airo-icon-circle-soft"/g, 'className="airo-icon-circle"');
homeContent = homeContent.replace(/rgba\(255,255,255,0\.7\)/g, '#9ca3af');

fs.writeFileSync(homePath, homeContent);

// ---------------------------------------------------------
// 2. CREDITS SPEEDOMETER CARD
// ---------------------------------------------------------
let creditsContent = fs.readFileSync(creditsPath, 'utf8');

const creditsDarkCardRegex = /<div style=\{\{\s*background: "(?:linear-gradient|#1e1b2e)[\s\S]*?\}\}>/;
const newCreditsDarkCard = `<div className="airo-card-dark" style={{
            background: "#1e1b2e",
            border: "1px solid #362d59",
            borderRadius: "12px",
            padding: "24px",
            color: "#fff",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center"
        }}>`;
if (creditsDarkCardRegex.test(creditsContent)) {
    creditsContent = creditsContent.replace(creditsDarkCardRegex, newCreditsDarkCard);
} else {
    // If it's already using the class or something else, make sure replacing it
    creditsContent = creditsContent.replace(/<div className="airo-card-dark" style=\{\{[\s\S]*?\}\}>/, newCreditsDarkCard);
}

creditsContent = creditsContent.replace(/rgba\(255,255,255,0\.7\)/g, '#9ca3af');
creditsContent = creditsContent.replace(/background: "rgba\(149, 191, 71, 0\.12\)"/g, 'background: "rgba(124, 58, 237, 0.15)"');
creditsContent = creditsContent.replace(/<Icon source=\{CreditCardIcon\} tone="success" \/>/g, '<div style={{color: "#a78bfa"}}><Icon source={CreditCardIcon} tone="base" /></div>');
creditsContent = creditsContent.replace(/background: "rgba\(255,255,255,0\.2\)"/g, 'background: "#362d59"');
creditsContent = creditsContent.replace(/stroke="rgba\(255,255,255,0\.1\)"/g, 'stroke="#362d59"');
creditsContent = creditsContent.replace(/stroke="#[A-Fa-f0-9]+"/g, 'stroke="#7c3aed"');
creditsContent = creditsContent.replace(/rgba\(149, 191, 71, 0\.08\)/g, 'rgba(124, 58, 237, 0.08)');
creditsContent = creditsContent.replace(/filter: "drop-shadow\(0 0 4px rgba\(149, 191, 71, 0\.4\)\)"/g, 'filter: "none"');

fs.writeFileSync(creditsPath, creditsContent);

// ---------------------------------------------------------
// 3. RECENT JOBS TABLE
// ---------------------------------------------------------
let jobsContent = fs.readFileSync(jobsPath, 'utf8');

const jobsContainerRegex = /<div style=\{\{\s*background: "(?:linear-gradient|#1e1b2e)[\s\S]*?\}\}>/;
const newJobsContainer = `<div style={{
            background: "#1e1b2e",
            border: "1px solid #362d59",
            borderRadius: "12px",
            color: "#fff",
            overflow: "hidden",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
        }}>`;

jobsContent = jobsContent.replace(jobsContainerRegex, newJobsContainer);

// Style fixes
jobsContent = jobsContent.replace(/color: rgba\(255, 255, 255, 0\.7\) !important;/g, 'color: #9ca3af !important;');
jobsContent = jobsContent.replace(/\.airo-dark-jobs \.Polaris-Button \{ [^}]* \}/g, '.airo-dark-jobs .Polaris-Button { background: rgba(255,255,255,0.05); color: #fff; border: 1px solid #362d59 !important; }\n                .airo-dark-jobs .Polaris-Button:hover { background: rgba(255,255,255,0.1); }');
jobsContent = jobsContent.replace(/borderBottom: "1px solid rgba\(139, 92, 246, 0\.3\)"/g, 'borderBottom: "1px solid #362d59"');
jobsContent = jobsContent.replace(/backgroundColor: "rgba\(139, 92, 246, 0\.1\)"/g, 'backgroundColor: "transparent"');
jobsContent = jobsContent.replace(/<tr\s*key=\{job\.id\}[\s\S]*?onMouseLeave=\{[\s\S]*?\}\s*>/, `<tr
                                            key={job.id}
                                            onClick={() => handleRowClick(job.id)}
                                            style={{
                                                borderBottom: "1px solid #362d59",
                                                cursor: "pointer",
                                                transition: "background-color 0.2s",
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)")}
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                        >`);
jobsContent = jobsContent.replace(/color: "rgba\(255,255,255,0\.7\)"/g, 'color: "#9ca3af"');

fs.writeFileSync(jobsPath, jobsContent);
console.log("SUCCESS");
