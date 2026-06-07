import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';
import reportWebVitals from './reportWebVitals';
import fifaEmblem from './assets/nation_icons/2026_FIFA_World_Cup_emblem.svg.webp';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <BrowserRouter basename="/fifa-wc-predict">
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// set favicon to FIFA emblem (bundled asset)
const setFavicon = (url: string) => {
  const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
  if (link) link.href = url;
  else {
    const newLink = document.createElement('link');
    newLink.rel = 'icon';
    newLink.href = url;
    document.head.appendChild(newLink);
  }
};

setFavicon(fifaEmblem as unknown as string);

reportWebVitals();
