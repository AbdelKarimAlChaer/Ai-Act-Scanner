import type { ChatbotProvider } from "@ai-act-scanner/shared";

export interface ProviderSignature {
  id: ChatbotProvider;
  label: string;
  requestPatterns: RegExp[];
  globalObjects: string[];
  domSelectors: string[];
}

// Signatures are intentionally loose (substring/regex on script src, request
// URLs, and known global JS objects) since every vendor changes markup over
// time; the generic heuristic below is the fallback for anything not listed.
export const PROVIDER_SIGNATURES: ProviderSignature[] = [
  {
    id: "intercom",
    label: "Intercom",
    requestPatterns: [/widget\.intercom\.io/i, /js\.intercomcdn\.com/i],
    globalObjects: ["Intercom"],
    domSelectors: ["#intercom-container", ".intercom-lightweight-app"],
  },
  {
    id: "drift",
    label: "Drift",
    requestPatterns: [/js\.driftt\.com/i, /widget\.drift\.com/i],
    globalObjects: ["drift", "driftt"],
    domSelectors: ["#drift-widget", "[id^='drift-frame']"],
  },
  {
    id: "crisp",
    label: "Crisp",
    requestPatterns: [/client\.crisp\.chat/i],
    globalObjects: ["$crisp", "CRISP_WEBSITE_ID"],
    domSelectors: ["#crisp-chatbox"],
  },
  {
    id: "tidio",
    label: "Tidio",
    requestPatterns: [/code\.tidio\.co/i],
    globalObjects: ["tidioChatApi"],
    domSelectors: ["#tidio-chat", "iframe[id^='tidio-chat']"],
  },
  {
    id: "tawkto",
    label: "Tawk.to",
    requestPatterns: [/embed\.tawk\.to/i],
    globalObjects: ["Tawk_API"],
    domSelectors: ["iframe[title='chat widget']"],
  },
  {
    id: "hubspot",
    label: "HubSpot Conversations",
    requestPatterns: [/js\.hs-scripts\.com/i, /js\.usemessages\.com/i, /app\.hubspot\.com\/conversations/i],
    globalObjects: ["HubSpotConversations"],
    domSelectors: ["#hubspot-messages-iframe-container"],
  },
  {
    id: "zendesk",
    label: "Zendesk / Zopim",
    requestPatterns: [/static\.zdassets\.com/i, /v2\.zopim\.com/i],
    globalObjects: ["zE", "$zopim"],
    domSelectors: ["#launcher", "iframe[title='Messaging window']"],
  },
  {
    id: "freshchat",
    label: "Freshchat",
    requestPatterns: [/wchat\.freshchat\.com/i, /wchat\.freshworks\.com/i],
    globalObjects: ["fcWidget"],
    domSelectors: ["#fc_frame"],
  },
  {
    id: "livechat",
    label: "LiveChat",
    requestPatterns: [/cdn\.livechatinc\.com/i],
    globalObjects: ["LiveChatWidget", "__lc"],
    domSelectors: ["#chat-widget-container"],
  },
  {
    id: "userlike",
    label: "Userlike",
    requestPatterns: [/userlike\.com\/widget/i, /widgets\.userlike\.com/i],
    globalObjects: ["userlike"],
    domSelectors: ["#userlike-chat-window"],
  },
  {
    id: "smartsupp",
    label: "Smartsupp",
    requestPatterns: [/widget-cdn\.smartsupp\.com/i, /www\.smartsuppchat\.com/i],
    globalObjects: ["smartsupp"],
    domSelectors: ["#smartsupp-widget-container"],
  },
  {
    id: "chatra",
    label: "Chatra",
    requestPatterns: [/call\.chatra\.io/i],
    globalObjects: ["Chatra", "ChatraID"],
    domSelectors: ["#chatra"],
  },
  {
    id: "chaport",
    label: "Chaport",
    requestPatterns: [/app\.chaport\.com/i],
    globalObjects: ["chaport"],
    domSelectors: ["#chaport-container"],
  },
  {
    id: "olark",
    label: "Olark",
    requestPatterns: [/static\.olark\.com/i],
    globalObjects: ["olark"],
    domSelectors: ["#olark-wrapper"],
  },
  {
    id: "front_chat",
    label: "Front Chat",
    requestPatterns: [/chat-assets\.frontapp\.com/i],
    globalObjects: ["FrontChat"],
    domSelectors: ["#front-chat-iframe"],
  },
  {
    id: "trengo",
    label: "Trengo",
    requestPatterns: [/static\.widget\.trengo\.eu/i],
    globalObjects: ["Trengo"],
    domSelectors: ["#trengo-web-widget"],
  },
  {
    id: "brevo",
    label: "Brevo Conversations",
    requestPatterns: [/conversations-widget\.brevo\.com/i, /sibautomation\.com/i],
    globalObjects: ["BrevoConversations"],
    domSelectors: ["#brevo-conversations-widget"],
  },
  {
    id: "landbot",
    label: "Landbot",
    requestPatterns: [/cdn\.landbot\.io/i],
    globalObjects: ["Landbot"],
    domSelectors: ["landbot-widget", "#myLandbot"],
  },
  {
    id: "voiceflow",
    label: "Voiceflow",
    requestPatterns: [/cdn\.voiceflow\.com/i, /general-runtime\.voiceflow\.com/i],
    globalObjects: ["voiceflow"],
    domSelectors: ["#voiceflow-chat"],
  },
  {
    id: "botpress",
    label: "Botpress",
    requestPatterns: [/cdn\.botpress\.cloud/i],
    globalObjects: ["botpressWebChat"],
    domSelectors: ["#bp-web-widget-container"],
  },
  {
    id: "manychat",
    label: "ManyChat",
    requestPatterns: [/widget\.manychat\.com/i],
    globalObjects: ["Manychat"],
    domSelectors: [],
  },
  {
    id: "typebot",
    label: "Typebot",
    requestPatterns: [/cdn\.typebot\.io/i],
    globalObjects: ["Typebot"],
    domSelectors: ["typebot-standard", "typebot-bubble"],
  },
];

export const CUSTOM_LLM_REQUEST_PATTERNS: RegExp[] = [
  /api\.openai\.com/i,
  /api\.anthropic\.com/i,
  /generativelanguage\.googleapis\.com/i,
  /\.azure\.com\/openai/i,
];

export const GENERIC_CHAT_CLASS_HINTS = ["chat", "messenger", "assistant", "bot"];
