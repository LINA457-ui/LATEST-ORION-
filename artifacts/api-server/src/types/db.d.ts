declare module "../../../../lib/db/dist/index.js" {
  export const db: any;
}

declare module "../../../../lib/db/dist/schema/index.js" {
  export const accounts: any;
  export const holdings: any;
  export const orders: any;
  export const transactions: any;
  export const conversations: any;
  export const messages: any;
  export const watchlist: any;
}

declare module "../../../../lib/api-zod/dist/index.js" {
  export const PlaceOrderBody: any;
  export const CreateDepositCheckoutBody: any;
  export const ConfirmDepositBody: any;
  export const CreateOpenaiConversationBody: any;
  export const SendOpenaiMessageBody: any;
  export const SendOpenaiMessageParams: any;
  export const GetOpenaiConversationParams: any;
  export const DeleteOpenaiConversationParams: any;
  export const ListOpenaiMessagesParams: any;
}

declare module "../../../../lib/integrations-openai-ai-server/dist/index.js" {
  export const openai: any;
}