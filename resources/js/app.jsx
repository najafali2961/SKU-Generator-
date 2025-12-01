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
                        Sku Generator
                    </a>
                    <a
                        href="/barcode-generator"
                        onClick={(event) => {
                            event.preventDefault();
                            router.visit("/barcode-generator");
                        }}
                        rel="barcode-generator"
                    >
                        Barcode Generator
                    </a>
                </NavMenu>

                <App {...props} />
            </AppProvider>
        );
    },
});
