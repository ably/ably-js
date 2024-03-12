import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout.js';
import UseChannelBasic from './pages/UseChannelBasic.js';
import UseChannelDerived from './pages/UseChannelDerived.js';
import UseChannelRewind from './pages/UseChannelRewind.js';
import UsePresence from './pages/UsePresence.js';
import UsePresenceOnlyEnter from './pages/UsePresenceOnlyEnter.js';
import UsePresenceOnlySubscribe from './pages/UsePresenceOnlySubscribe.js';
import Dashboard from './pages/dashboard.js';
import UsePresenceSwitchable from './pages/UsePresenceSwitchable.js';
import UsePresenceUseChannelOptions from './pages/UsePresenceUseChannelOptions.js';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="UseChannelBasic" element={<UseChannelBasic />} />
          <Route path="UseChannelDerived" element={<UseChannelDerived />} />
          <Route path="UseChannelRewind" element={<UseChannelRewind />} />
          <Route path="UsePresence" element={<UsePresence />} />
          <Route path="UsePresenceOnlyEnter" element={<UsePresenceOnlyEnter />} />
          <Route path="UsePresenceOnlySubscribe" element={<UsePresenceOnlySubscribe />} />
          <Route path="UsePresenceSwitchable" element={<UsePresenceSwitchable />} />
          <Route path="UsePresenceUseChannelOptions" element={<UsePresenceUseChannelOptions />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
