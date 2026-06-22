export type attachType = {
  icon?: string;
  file?: string;
  fileSize?: string;
};

export type MessageType = {
  createdAt?: any;
  msg: string;
  senderId: number | string;
  type: string;
  attachment: attachType[];
  id: string;
};

export interface ChatsType {
  id: number; // DB id
  name: string;
  room_id: string;
  last_message?: string;
  last_active?: string;
  status: string;
  thumb: string;
  messages?: MessageType[];
  widget_token?: string;
  isTyping?: boolean;
}
