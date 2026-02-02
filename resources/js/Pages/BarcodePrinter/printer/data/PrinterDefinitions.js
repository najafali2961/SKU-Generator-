export const PRINTER_MODES = [
    {
        id: "label",
        title: "Label Printer",
        description: "Roll-based thermal printers (Zebra, Dymo, Rollo)",
        icon: "printer_roll",
    },
    {
        id: "sheet",
        title: "Sheet Printer",
        description: "Standard Laser/Inkjet (A4, Letter)",
        icon: "printer_sheet",
    },
    {
        id: "receipt",
        title: "Receipt Printer",
        description: "Continuous thermal paper (58mm, 80mm)",
        icon: "printer_receipt",
    },
];

export const PRINTER_BRANDS = {
    label: [
        { id: "zebra", name: "Zebra" },
        { id: "dymo", name: "DYMO" },
        { id: "brother", name: "Brother" },
        { id: "rollo", name: "Rollo" },
        { id: "generic_roll", name: "Generic / Other" },
    ],
    sheet: [
        { id: "generic_sheet", name: "Standard Laser/Inkjet" },
    ],
    receipt: [
        { id: "generic_receipt", name: "Standard Thermal POS" },
    ]
};

export const PRINTER_MODELS = {
    zebra: [
        { id: "zd220", name: "ZD220 / ZD230", type: "roll" },
        { id: "zd420", name: "ZD420 / ZD620", type: "roll" },
        { id: "lp2844", name: "LP2844 (Legacy)", type: "roll" },
    ],
    dymo: [
        { id: "lw450", name: "LabelWriter 450", type: "roll" },
        { id: "lw550", name: "LabelWriter 550", type: "roll" },
        { id: "lw_4xl", name: "LabelWriter 4XL", type: "roll" },
    ],
    brother: [
        { id: "ql700", name: "QL-700 / QL-800", type: "roll" },
        { id: "ql1100", name: "QL-1100 (Wide)", type: "roll" },
    ],
    rollo: [
        { id: "rollo_usb", name: "Rollo USB", type: "roll" },
        { id: "rollo_wireless", name: "Rollo Wireless", type: "roll" },
    ],
    generic_roll: [
        { id: "generic_2inch", name: "2 Inch Width", type: "roll" },
        { id: "generic_3inch", name: "3 Inch Width", type: "roll" },
        { id: "generic_4inch", name: "4 Inch Width", type: "roll" },
    ],
    generic_sheet: [
        { id: "a4_printer", name: "A4 Printer", type: "sheet" },
        { id: "letter_printer", name: "Letter Printer", type: "sheet" },
    ],
    generic_receipt: [
        { id: "58mm", name: "58mm (2-inch)", type: "receipt" },
        { id: "80mm", name: "80mm (3-inch)", type: "receipt" },
    ]
};

// Auto-Locked Configs when a specific "Paper/Size" is chosen
export const PAPER_DEFINITIONS = {
    // === ROLL SIZES ===
    "zebra_2x1": { width: 50.8, height: 25.4, name: '2" x 1"', margins: 0 },
    "zebra_3x1": { width: 76.2, height: 25.4, name: '3" x 1"', margins: 0 },
    "zebra_3x2": { width: 76.2, height: 50.8, name: '3" x 2"', margins: 0 },
    "zebra_4x6": { width: 101.6, height: 152.4, name: '4" x 6" Shipping', margins: 0 },

    "dymo_30252": { width: 89, height: 28, name: 'Address (30252)', margins: 0 },
    "dymo_30334": { width: 57, height: 32, name: 'Multi-Purpose (30334)', margins: 0 },
    "dymo_30336": { width: 25, height: 54, name: 'Small (30336)', margins: 0 },

    "brother_dk1201": { width: 62, height: 29, name: 'Standard Address (DK-1201)', margins: 0 },
    "brother_dk1202": { width: 62, height: 100, name: 'Shipping (DK-1202)', margins: 0 },

    // === SHEET TEMPLATES ===
    "a4_av_l7160": {
        name: "Avery L7160 (21/sheet)",
        paper_width: 210, paper_height: 297,
        rows: 7, cols: 3,
        label_width: 63.5, label_height: 38.1,
        margin_top: 15.1, margin_left: 7.2, // Approx
        gap_h: 2.5, gap_v: 0
    },
    "a4_av_l7163": {
        name: "Avery L7163 (14/sheet)",
        paper_width: 210, paper_height: 297,
        rows: 7, cols: 2,
        label_width: 99.1, label_height: 38.1,
        margin_top: 15.1, margin_left: 4.6,
        gap_h: 2.5, gap_v: 0
    },
    "letter_av_5160": {
        name: "Avery 5160 (30/sheet)",
        paper_width: 215.9, paper_height: 279.4,
        rows: 10, cols: 3,
        label_width: 66.6, label_height: 25.4,
        margin_top: 12.7, margin_left: 4.8,
        gap_h: 3, gap_v: 0
    }
};

export const SMART_PRESETS = [
    {
        id: "sku_qr_standard",
        title: "SKU + QR",
        description: "Best for Inventory",
        icon: "qr_code_2",
        settings: {
            barcode_type: "qr",
            barcode_width: 15, // mm
            barcode_height: 15,
            show_product_title: true,
            show_sku: true,
            show_price: false,
            show_variant: true,
            font_size: 9,
        }
    },
    {
        id: "barcode_only",
        title: "Barcode Only",
        description: "Fast Scanning",
        icon: "barcode",
        settings: {
            barcode_type: "code128",
            barcode_width: 40,
            barcode_height: 15,
            show_product_title: false,
            show_sku: true,
            show_price: false,
            show_variant: false,
            font_size: 8,
        }
    },
    {
        id: "retail_tag",
        title: "Retail Tag",
        description: "Product + Price",
        icon: "sell",
        settings: {
            barcode_type: "ean13",
            barcode_width: 30,
            barcode_height: 10,
            show_product_title: true,
            show_sku: false,
            show_price: true,
            show_variant: true,
            font_size: 10,
            title_font_size: 12,
            title_bold: true
        }
    }
];
