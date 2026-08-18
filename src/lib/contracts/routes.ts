export const routes = {
  home: "/",
  quiz: "/quiz",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
  account: "/account",
  accountActivity: "/account/activity",
  accountStyle: "/account/style",
  accountBudget: "/account/budget",
  accountPrivacy: "/account/privacy",
  accountConversations: "/account/conversations",
  accountChat: "/account/chat",
  accountCanvas: "/account/canvas",
  accountConversation: (conversationId: string) =>
    `/account/conversations/${conversationId}`,
  accountProjects: "/account/projects",
  accountProject: (projectId: string) => `/account/projects/${projectId}`,
  accountQuiz: "/account/quiz",
  accountUploads: "/account/uploads",
  accountImageGeneration: "/account/image-generation",
  accountImageGenerationItem: (generationId: string) =>
    `/account/image-generation?generation=${generationId}`,
  accountInspiration: "/account/inspiration",
  accountInspirationItem: (itemId: string) =>
    `/account/inspiration?item=${itemId}`,
  accountSettings: "/account/settings",
  accountHelp: "/account/help",
  apiAccountStudioPieces: "/api/account/studio/pieces",
  apiAccountStudioPiece: (pieceId: string) =>
    `/api/account/studio/pieces/${pieceId}`,
  apiAccountConversationSuggestions: (conversationId: string) =>
    `/api/account/conversations/${conversationId}/suggestions`,
  apiAccountConversationBrainstorm: (conversationId: string) =>
    `/api/account/conversations/${conversationId}/brainstorm`,
  apiAccountConversationRecommendations: (conversationId: string) =>
    `/api/account/conversations/${conversationId}/recommendations`,
  apiAccountConversationInsights: (conversationId: string) =>
    `/api/account/conversations/${conversationId}/insights`,
  apiAccountConversationShare: (conversationId: string) =>
    `/api/account/conversations/${conversationId}/share`,
  apiAccountPreferencesCalibration: "/api/account/preferences/calibration",
  apiAccountRoomPlans: "/api/account/room-plans",
  apiAccountRoomPlan: (roomPlanId: string) =>
    `/api/account/room-plans/${roomPlanId}`,
  apiAccountRoomPlanItems: (roomPlanId: string) =>
    `/api/account/room-plans/${roomPlanId}/items`,
  apiAccountRoomPlanItem: (roomPlanId: string, itemId: string) =>
    `/api/account/room-plans/${roomPlanId}/items/${itemId}`,
  apiAccountDesignBrief: "/api/account/design-brief",
  apiAccountConversationRenders: (conversationId: string) =>
    `/api/account/conversations/${conversationId}/renders`,
  apiShared: (shareId: string) => `/api/shared/${shareId}`,
  sharedPage: (shareId: string) => `/shared/${shareId}`,
  terms: "/terms",
  privacy: "/privacy-policy",
  refunds: "/refund-policy",
  contact: "/contact",
} as const;
