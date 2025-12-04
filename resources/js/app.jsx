// import "../css/app.css";
// import "@shopify/polaris/build/esm/styles.css";
// import { createRoot } from "react-dom/client";
// import { createInertiaApp } from "@inertiajs/react";
// import { router } from "@inertiajs/react";
// import { AppProvider } from "@shopify/polaris";
// import { NavMenu } from "@shopify/app-bridge-react";
// import enTranslations from "@shopify/polaris/locales/en.json";
// import "./bootstrap";

// const pages = import.meta.glob("./Pages/**/*.jsx");

// createInertiaApp({
//     resolve: (name) => {
//         const importPage = pages[`./Pages/${name}.jsx`];
//         if (!importPage) throw new Error(`Page not found: ./Pages/${name}.jsx`);
//         return importPage();
//     },
//     setup({ el, App, props }) {
//         createRoot(el).render(
//             <AppProvider i18n={enTranslations}>
//                 <NavMenu>
//                     <a
//                         href="/"
//                         onClick={(event) => {
//                             event.preventDefault();
//                             router.visit("/");
//                         }}
//                         rel="home"
//                     >
//                         Home
//                     </a>
//                     <a
//                         href="/sku-generator"
//                         onClick={(event) => {
//                             event.preventDefault();
//                             router.visit("/sku-generator");
//                         }}
//                         rel="sku-generator"
//                     >
//                         Sku Generator
//                     </a>
//                     <a
//                         href="/barcode-generator"
//                         onClick={(event) => {
//                             event.preventDefault();
//                             router.visit("/barcode-generator");
//                         }}
//                         rel="barcode-generator"
//                     >
//                         Barcode Generator
//                     </a>
//                     <a
//                         href="/jobs"
//                         onClick={(e) => {
//                             e.preventDefault();
//                             router.visit("/jobs");
//                         }}
//                         style={{
//                             fontWeight:
//                                 window.location.pathname === "/jobs"
//                                     ? "bold"
//                                     : "normal",
//                         }}
//                     >
//                         History
//                     </a>
//                 </NavMenu>

//                 <App {...props} />
//             </AppProvider>
//         );
//     },
// });

import "../css/app.css";
import "@shopify/polaris/build/esm/styles.css";
import { createRoot } from "react-dom/client";
import { createInertiaApp } from "@inertiajs/react";
import { router } from "@inertiajs/react";
import { AppProvider } from "@shopify/polaris";
import { NavMenu } from "@shopify/app-bridge-react";
import enTranslations from "@shopify/polaris/locales/en.json";
import "./bootstrap";

const pages = import.meta.glob("./Pages/**/*.jsx");

createInertiaApp({
    resolve: (name) => {
        const importPage = pages[`./Pages/${name}.jsx`];
        if (!importPage) throw new Error(`Page not found: ./Pages/${name}.jsx`);
        return importPage();
    },
    setup({ el, App, props }) {
        createRoot(el).render(
            <AppProvider i18n={enTranslations}>
                <NavMenu>
                    <a
                        href="/"
                        onClick={(event) => {
                            event.preventDefault();
                            router.visit("/");
                        }}
                        rel="home"
                    >
                        Home
                    </a>
                    <a
                        href="/sku-generator"
                        onClick={(event) => {
                            event.preventDefault();
                            router.visit("/sku-generator");
                        }}
                        rel="sku-generator"
                    >
                        Generator SKU
                    </a>
                    <a
                        href="/barcode-generator"
                        onClick={(event) => {
                            event.preventDefault();
                            router.visit("/barcode-generator");
                        }}
                        rel="barcode-generator"
                    >
                        Generator Barcode
                    </a>
                    <a
                        href="/barcode-import"
                        onClick={(event) => {
                            event.preventDefault();
                            router.visit("/barcode-import");
                        }}
                        rel="barcode-import"
                        style={{
                            fontWeight:
                                window.location.pathname === "/barcode-import"
                                    ? "bold"
                                    : "normal",
                        }}
                    >
                        Import Barcodes
                    </a>
                    <a
                        href="/barcode-printer"
                        onClick={(event) => {
                            event.preventDefault();
                            router.visit("/barcode-printer");
                        }}
                        rel="barcode-printer"
                        style={{
                            fontWeight:
                                window.location.pathname === "/barcode-printer"
                                    ? "bold"
                                    : "normal",
                        }}
                    >
                        Print Labels
                    </a>
                    <a
                        href="/jobs"
                        onClick={(e) => {
                            e.preventDefault();
                            router.visit("/jobs");
                        }}
                        style={{
                            fontWeight:
                                window.location.pathname === "/jobs"
                                    ? "bold"
                                    : "normal",
                        }}
                    >
                        History
                    </a>
                </NavMenu>

                <App {...props} />
            </AppProvider>
        );
    },
});
