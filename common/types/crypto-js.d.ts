declare module 'crypto-js/build/enc-base64' {
    import CryptoJS from 'crypto-js';
    export const parse: typeof CryptoJS.enc.Base64.parse;
}
