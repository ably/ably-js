export default interface IDefaults {
    internetUpUrl: string;
    jsonpInternetUpUrl?: string;
    defaultTransports: string[];
    baseTransportOrder: string[];
    transportPreferenceOrder: string[];
    upgradeTransports: string[];
    restAgentOptions?: { keepAlive: boolean, maxSockets: number };
}
