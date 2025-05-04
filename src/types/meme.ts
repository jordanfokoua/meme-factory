import { GetUserByIdResponse } from '../api';

export type MemePictureText = {
  content: string;
  x: number;
  y: number;
};

export type MemeResult = {
  id: string;
  authorId: string;
  pictureUrl: string;
  description: string;
  commentsCount: string;
  texts: MemePictureText[];
  createdAt: string;
};

export type MemeCardType = {
  id: string;
  description: string;
  pictureUrl: string;
  texts: MemePictureText[];
  author: GetUserByIdResponse;
  commentsCount: number;
  createdAt: string;
};

export type MemeCommentResult = {
  id: string;
  authorId: string;
  memeId: string;
  content: string;
  createdAt: string;
};

export type MemeCardCommentType = {
  id: string;
  content: string;
  author: GetUserByIdResponse;
  createdAt: string;
};

export type MemeCardCommentPageType = {
  comments: MemeCardCommentType[];
  nextPage: number | undefined;
}; 

export type CreateMemeResponse = {
  id: string;
  authorId: string;
  pictureUrl: string;
  descripition: string;
  texts: MemePictureText[];
  commentsCount: number;
  createdAt: string;
};