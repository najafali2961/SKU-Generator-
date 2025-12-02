// resources/js/Pages/History.jsx
import React from "react";
import { Card, Page, Text } from "@shopify/polaris";
import RecentJobsTable from "./RecentJobsTable"; // Adjust path if needed

export default function History({ jobs }) {
    return (
        <Page title="Job History" breadcrumbs={[{ content: "Home", url: "/" }]}>
            <Card padding="0">
                {/* Reuse your existing table but show ALL jobs, no limit */}
                <RecentJobsTable jobs={jobs} showAll={true} />
            </Card>
        </Page>
    );
}
