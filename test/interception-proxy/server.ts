import { ControlServer } from './ControlServer';
import { InterceptionContext } from './InterceptionContext';
import { ProxyServer } from './ProxyServer';

// TODO cleanup as control server connections go away
// TODO cleanup as intercepted connections go away

const interceptionContext = new InterceptionContext();

const controlServer = new ControlServer(interceptionContext);
controlServer.start();

const proxyServer = new ProxyServer(interceptionContext);
proxyServer.start();
