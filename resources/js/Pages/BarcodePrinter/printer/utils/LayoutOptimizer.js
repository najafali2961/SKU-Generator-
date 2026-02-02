export const analyzeLayout = (config) => {
    const {
        paper_width,
        paper_height,
        label_width,
        label_height,
        labels_per_row,
        labels_per_column,
        margin_top,
        margin_bottom,
        margin_left,
        margin_right,
        label_spacing_horizontal,
        label_spacing_vertical,
    } = config;

    const issues = [];
    let status = "PERFECT";

    // 1. Calculate Total Dimensions
    const totalRowWidth =
        labels_per_row * label_width +
        (labels_per_row - 1) * label_spacing_horizontal;

    const totalColHeight =
        labels_per_column * label_height +
        (labels_per_column - 1) * label_spacing_vertical;

    const availableWidth = paper_width - margin_left - margin_right;
    const availableHeight = paper_height - margin_top - margin_bottom;

    // 2. Check Bounds
    if (totalRowWidth > availableWidth) {
        status = "ERROR";
        issues.push({
            type: "error",
            message: `Content is ${Math.round((totalRowWidth - availableWidth) * 10) / 10}mm too wide for margins.`,
        });
    }

    if (totalColHeight > availableHeight) {
        status = "ERROR";
        issues.push({
            type: "error",
            message: `Content is ${Math.round((totalColHeight - availableHeight) * 10) / 10}mm too tall for margins.`,
        });
    }

    // 3. Check Efficiency
    // Only check efficiency if no errors
    if (status !== "ERROR") {
        const remainingWidth = availableWidth - totalRowWidth;
        const remainingHeight = availableHeight - totalColHeight;

        // Can we fit another column?
        if (remainingWidth >= label_width + label_spacing_horizontal) {
            status = "WARNING";
            issues.push({
                type: "info",
                message: "You can fit 1 more column!",
            });
        }

        // Can we fit another row?
        if (remainingHeight >= label_height + label_spacing_vertical) {
            status = "WARNING";
            issues.push({
                type: "info",
                message: "You can fit 1 more row!",
            });
        }

        // Check if margins are excessively large (>20mm) and we are not using a specialized small paper
        const isSmallPaper = paper_width < 100 || paper_height < 100;
        if (!isSmallPaper && (remainingWidth > 40 || remainingHeight > 40)) {
            if (status === "PERFECT") status = "GOOD"; // Downgrade slightly
            issues.push({
                type: "info",
                message: "Large unused space. Consider adjusting margins or gaps."
            });
        }
    }

    return { status, issues };
};

export const getPrinterPreset = (model) => {
    switch (model) {
        case "dymo_450":
            return {
                paper_width: 89,
                paper_height: 36,
                margin_top: 0,
                margin_bottom: 0,
                margin_left: 0,
                margin_right: 0,
                labels_per_row: 1,
                labels_per_column: 1,
                label_spacing_horizontal: 0,
                label_spacing_vertical: 0,
            };
        case "zebra_4x6":
            return {
                paper_width: 101.6, // 4 inches
                paper_height: 152.4, // 6 inches
                margin_top: 0,
                margin_bottom: 0,
                margin_left: 0,
                margin_right: 0,
                labels_per_row: 1,
                labels_per_column: 1,
                label_spacing_horizontal: 0,
                label_spacing_vertical: 0,
            };
        case "brother_ql":
            return {
                paper_width: 62,
                paper_height: 29, // standard address
                margin_top: 0,
                margin_bottom: 0,
                margin_left: 0,
                margin_right: 0,
                labels_per_row: 1,
                labels_per_column: 1,
            };
        case "a4_3x7":
            return {
                paper_width: 210,
                paper_height: 297,
                margin_top: 10,
                margin_bottom: 10,
                margin_left: 5,
                margin_right: 5,
                labels_per_row: 3,
                labels_per_column: 7,
                label_width: 63.5,
                label_height: 38.1,
            };
        default:
            return null;
    }
};

export const calculateAutoFit = (config) => {
    // 1. Determine safe margins (default 5mm for sheets, 0mm for thermal)
    // Heuristic: If paper is small (<110mm width), assume thermal -> 0 margin
    const isThermal = config.paper_width < 110;
    const safeMargin = isThermal ? 0 : 5;

    // 2. Available Area
    const availW = config.paper_width - (safeMargin * 2);
    const availH = config.paper_height - (safeMargin * 2);

    // 3. Calculate max cols/rows
    // width = cols * dw + (cols-1) * gap
    // width = cols * (dw + gap) - gap
    // width + gap = cols * (dw + gap)
    // cols = (width + gap) / (dw + gap)

    // Default Gap
    const gapH = isThermal ? 0 : 2; // 2mm gap for sheets
    const gapV = isThermal ? 0 : 0; // 0mm vgap usually

    const maxCols = Math.floor((availW + gapH) / (config.label_width + gapH));
    const maxRows = Math.floor((availH + gapV) / (config.label_height + gapV));

    return {
        margin_top: safeMargin,
        margin_bottom: safeMargin,
        margin_left: safeMargin,
        margin_right: safeMargin,
        labels_per_row: Math.max(1, maxCols),
        labels_per_column: Math.max(1, maxRows),
        label_spacing_horizontal: gapH,
        label_spacing_vertical: gapV
    };
};
