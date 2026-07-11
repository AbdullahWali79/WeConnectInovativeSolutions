export type WhatsAppTemplateParameter = {
  type: "text";
  text: string;
};

export type WhatsAppTemplateComponent = {
  type: "body";
  parameters: WhatsAppTemplateParameter[];
};

export type WhatsAppTemplateMessageInput = {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: WhatsAppTemplateComponent[];
};

export type WhatsAppSendResult = {
  messaging_product?: string;
  contacts?: Array<{ input?: string; wa_id?: string }>;
  messages?: Array<{ id?: string; message_status?: string }>;
};

export type PendingTaskSummary = {
  totalPendingTasks: number;
  overdueTasks: number;
  submittedButUngraded: number;
};
