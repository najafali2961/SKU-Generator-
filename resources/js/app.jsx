import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
import '@shopify/polaris/build/esm/styles.css';
import { createRoot } from 'react-dom/client';
import { AppProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import './bootstrap';

const pages = import.meta.glob('./Pages/**/*.jsx'); // ✅ include nested folders

createInertiaApp({
  resolve: (name) => {
    const importPage = pages[`./Pages/${name}.jsx`];
    if (!importPage) throw new Error(`Page not found: ./Pages/${name}.jsx`);
    return importPage();
  },
  setup({ el, App, props }) {
    createRoot(el).render(
      <AppProvider i18n={enTranslations}>
        <App {...props} />
      </AppProvider>
    );
  },
});
