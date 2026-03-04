export type ActiveMediaResult = {
  status: string;
  title?: string;
  videoId?: string;
  type?: string;
  link?: string;
  thumbnail?: string;
};

export type SearchResultItem = {
  renderedContent?: string;
  title?: string;
  snippet?: string;
  link?: string;
};

export type EmailStatus = {
  status: 'idle' | 'sending' | 'success';
  message?: string;
};
