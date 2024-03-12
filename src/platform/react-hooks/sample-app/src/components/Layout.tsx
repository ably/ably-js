import React from 'react';
import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="App">
      <nav>
        <ul>
          <li>
            <Link to="/">Dashboard</Link>
          </li>
          <li>
            <Link to="/UseChannelBasic">UseChannelBasic</Link>
          </li>
          <li>
            <Link to="/UseChannelDerived">UseChannelDerived</Link>
          </li>
          <li>
            <Link to="/UseChannelRewind">UseChannelRewind</Link>
          </li>
          <li>
            <Link to="/UsePresence">UsePresence</Link>
          </li>
          <li>
            <Link to="/UsePresenceOnlyEnter">UsePresenceOnlyEnter</Link>
          </li>
          <li>
            <Link to="/UsePresenceOnlySubscribe">UsePresenceOnlySubscribe</Link>
          </li>
          <li>
            <Link to="/UsePresenceSwitchable">UsePresenceSwitchable</Link>
          </li>
        </ul>
      </nav>

      <Outlet />
    </div>
  );
}
