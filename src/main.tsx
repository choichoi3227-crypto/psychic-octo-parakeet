import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { LandingPage } from './routes/index';

createRoot(document.getElementById('root')!).render(<LandingPage />);
