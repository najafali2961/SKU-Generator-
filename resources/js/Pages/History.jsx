import React from "react";
import { Card, Page, Text } from "@shopify/polaris";
import { router } from "@inertiajs/react";
import RecentJobsTable from "./RecentJobsTable"; // Adjust path if needed

export default function History({ jobs }) {
    return (
        <Page
            title="Job History"
            subtitle="View and track the status of all your bulk operations."
            backAction={{
                content: "Return",
                onAction: () => router.visit("/"),
            }}
            primaryAction={{
                content: "Refresh",
                onAction: () => router.visit(window.location.pathname),
            }}
        >
            <Card padding="0">
                {/* Reuse your existing table but show ALL jobs, no limit */}
                <RecentJobsTable jobs={jobs} showAll={true} />
            </Card>
        </Page>
    );
}
