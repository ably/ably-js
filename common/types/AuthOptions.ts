import HttpMethods from "../constants/HttpMethods";
import ErrorInfo from "../lib/types/errorinfo";
import TokenDetails from "./TokenDetails";
import TokenParams from "./TokenParams";
import TokenRequest from "./TokenRequest";

export default interface AuthOptions {
  /**
   * A function which is called when a new token is required.
   * The role of the callback is to either generate a signed TokenRequest which may then be submitted automatically
   * by the library to the Ably REST API requestToken; or to provide a valid token in as a TokenDetails object.
   **/
  authCallback?: (data: TokenParams, callback: (error: ErrorInfo | string, tokenRequestOrDetails: TokenDetails | TokenRequest | string) => void) => void;
  authHeaders?: { [index: string]: string };
  authMethod?: HttpMethods;
  authParams?: { [index: string]: string };

  /**
   * A URL that the library may use to obtain a token string (in plain text format), or a signed TokenRequest or TokenDetails (in JSON format).
   **/
  authUrl?: string;
  key?: string;
  queryTime?: boolean;
  token?: TokenDetails | string;
  tokenDetails?: TokenDetails;
  useTokenAuth?: boolean;

  /**
   * Optional clientId that can be used to specify the identity for this client. In most cases
   * it is preferable to instead specify a clientId in the token issued to this client.
   */
  clientId?: string;
}
