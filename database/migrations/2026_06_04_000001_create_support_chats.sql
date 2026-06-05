-- Backend handoff migration: live support chat.
-- Intended for Laravel/MySQL; convert UUID defaults/index names as needed for your DB driver.

CREATE TABLE chats (
  id CHAR(36) PRIMARY KEY,
  school_id CHAR(36) NOT NULL,
  subject VARCHAR(180) NOT NULL DEFAULT 'GWPL Technical Support',
  status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMP NULL,
  created_by CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX chats_school_status_idx (school_id, status),
  INDEX chats_last_message_idx (last_message_at)
);

CREATE TABLE chat_messages (
  id CHAR(36) PRIMARY KEY,
  chat_id CHAR(36) NOT NULL,
  sender_user_id CHAR(36) NULL,
  sender_role ENUM('school_admin', 'support') NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chat_messages_chat_id_fk FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  INDEX chat_messages_chat_created_idx (chat_id, created_at),
  INDEX chat_messages_unread_idx (chat_id, sender_role, read_at)
);
