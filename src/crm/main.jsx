import React from 'react';
import ReactDOM from 'react-dom/client';

import CrmApp from './CrmApp.jsx';
import '../index.css';

// Ativa a tipografia e o arredondamento corporativos do CRM (ver src/index.css).
document.documentElement.dataset.app = 'crm';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CrmApp />
  </React.StrictMode>,
);
