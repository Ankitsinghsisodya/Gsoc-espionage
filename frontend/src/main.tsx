import { Analytics } from '@vercel/analytics/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <HelmetProvider>
            <BrowserRouter>
                <App />
                <Analytics />
            </BrowserRouter>
        </HelmetProvider>
    </React.StrictMode>
);
