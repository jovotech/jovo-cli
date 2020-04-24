export const SMAPI_ENDPOINT = 'api.amazonalexa.com';

// Client ID and Client Secret for refreshing the users access token.
export const CLIENT_ID = 'amzn1.application-oa2-client.aad322b5faab44b980c8f87f94fbac56';
export const CLIENT_SECRET = '1642d8869b829dda3311d6c6539f3ead55192e3fc767b9071c888e60ef151cf9';

export enum STATUS {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404
}
