import { api } from './api';
import type { Attachment, AttachmentType } from '../types/attachment';

export type GetAttachmentsParams = {
  companyId?: string;
  taskId?: string;
  serviceRecordId?: string;
  uploadedByUserId?: string;
  type?: AttachmentType;
};

export type CreateAttachmentPayload = {
  file: File;
  companyId?: string;
  taskId?: string;
  serviceRecordId?: string;
  type?: AttachmentType;
};

export async function getAttachments(params?: GetAttachmentsParams) {
  const response = await api.get<Attachment[]>('/attachments', {
    params,
  });

  return response.data;
}

export async function createAttachment(payload: CreateAttachmentPayload) {
  const formData = new FormData();

  formData.append('file', payload.file);

  if (payload.companyId) {
    formData.append('companyId', payload.companyId);
  }

  if (payload.taskId) {
    formData.append('taskId', payload.taskId);
  }

  if (payload.serviceRecordId) {
    formData.append('serviceRecordId', payload.serviceRecordId);
  }

  if (payload.type) {
    formData.append('type', payload.type);
  }

  const response = await api.post<Attachment>('/attachments', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

export async function downloadAttachment(attachment: Attachment) {
  const response = await api.get<Blob>(
    `/attachments/${attachment.id}/download`,
    {
      responseType: 'blob',
    },
  );

  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');

  link.href = url;
  link.download = attachment.originalName || attachment.fileName;
  document.body.appendChild(link);
  link.click();

  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function removeAttachment(attachmentId: string) {
  await api.delete(`/attachments/${attachmentId}`);
}
